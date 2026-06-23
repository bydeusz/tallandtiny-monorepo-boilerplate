import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@repo/database';

interface ErrorPayload {
  statusCode: number;
  message: string | string[];
  error: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<{
      id?: string;
      originalUrl?: string;
      url?: string;
    }>();
    const response = ctx.getResponse<unknown>();
    const { statusCode, message, error } = this.mapException(exception);
    const path = httpAdapter.getRequestUrl(request as object) as string;

    this.logException(exception, statusCode, path, message);

    httpAdapter.reply(
      response,
      {
        success: false,
        statusCode,
        message,
        error,
        requestId: request.id ?? '',
        timestamp: new Date().toISOString(),
        path,
      },
      statusCode,
    );
  }

  private mapException(exception: unknown): ErrorPayload {
    if (exception instanceof HttpException) {
      return this.mapHttpException(exception);
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.mapKnownPrismaError(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid Prisma query payload.',
        error: 'Bad Request',
      };
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database connection could not be initialized.',
        error: 'Service Unavailable',
      };
    }

    if (
      exception instanceof Prisma.PrismaClientUnknownRequestError ||
      exception instanceof Prisma.PrismaClientRustPanicError
    ) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: this.isProduction()
          ? 'Internal server error'
          : exception.message,
        error: 'Internal Server Error',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message:
        !this.isProduction() && exception instanceof Error
          ? exception.message
          : 'Internal server error',
      error: 'Internal Server Error',
    };
  }

  private mapHttpException(exception: HttpException): ErrorPayload {
    const statusCode = exception.getStatus();
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return {
        statusCode,
        message: response,
        error: this.getHttpErrorLabel(statusCode),
      };
    }

    if (typeof response === 'object' && response !== null) {
      const responseBody = response as {
        message?: string | string[];
        error?: string;
      };

      return {
        statusCode,
        message: responseBody.message ?? exception.message,
        error: responseBody.error ?? this.getHttpErrorLabel(statusCode),
      };
    }

    return {
      statusCode,
      message: exception.message,
      error: this.getHttpErrorLabel(statusCode),
    };
  }

  private mapKnownPrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): ErrorPayload {
    switch (exception.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: this.buildP2002Message(exception),
          error: 'Conflict',
        };
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Requested record was not found.',
          error: 'Not Found',
        };
      case 'P2003':
      case 'P2014':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'The requested relation operation is invalid.',
          error: 'Bad Request',
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: this.isProduction()
            ? 'Internal server error'
            : exception.message,
          error: 'Internal Server Error',
        };
    }
  }

  private buildP2002Message(
    exception: Prisma.PrismaClientKnownRequestError,
  ): string {
    const target = exception.meta?.target;

    if (Array.isArray(target) && target.length > 0) {
      return `Unique constraint failed on: ${target.join(', ')}`;
    }

    return 'A record with this value already exists.';
  }

  private logException(
    exception: unknown,
    statusCode: number,
    path: string,
    message: string | string[],
  ): void {
    const messageLabel = Array.isArray(message) ? message.join('; ') : message;
    const logMessage = `[${statusCode}] ${path} - ${messageLabel}`;

    if (statusCode >= 500) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(logMessage, stack);
      return;
    }

    this.logger.warn(logMessage);
  }

  private getHttpErrorLabel(statusCode: number): string {
    const label = HttpStatus[statusCode];

    return typeof label === 'string'
      ? label
          .toLowerCase()
          .split('_')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ')
      : 'Error';
  }

  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }
}
