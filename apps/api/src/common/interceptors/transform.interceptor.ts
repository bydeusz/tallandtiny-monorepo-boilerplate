import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SKIP_TRANSFORM_KEY } from '../decorators';
import { ApiResponse } from '../interfaces';

interface HttpRequestLike {
  id?: string;
  originalUrl?: string;
  url?: string;
}

interface HttpResponseLike {
  statusCode?: number;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const skipTransform = this.reflector.getAllAndOverride<boolean>(
      SKIP_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTransform) {
      return next.handle() as Observable<ApiResponse<T>>;
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<HttpRequestLike>();
    const response = httpContext.getResponse<HttpResponseLike>();

    return next.handle().pipe(
      map((responseData) => {
        const { data, meta } = this.extractDataAndMeta(responseData);

        return {
          success: true,
          statusCode: response.statusCode ?? 200,
          data,
          meta,
          requestId: request.id ?? '',
          timestamp: new Date().toISOString(),
          path: request.originalUrl ?? request.url ?? '',
        };
      }),
    );
  }

  private extractDataAndMeta(payload: T): {
    data: T;
    meta: Record<string, unknown> | null;
  } {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      Array.isArray(payload)
    ) {
      return { data: payload, meta: null };
    }

    const candidate = payload as Record<string, unknown>;

    if ('data' in candidate && 'meta' in candidate) {
      return {
        data: candidate.data as T,
        meta:
          candidate.meta !== null && typeof candidate.meta === 'object'
            ? (candidate.meta as Record<string, unknown>)
            : null,
      };
    }

    return { data: payload, meta: null };
  }
}
