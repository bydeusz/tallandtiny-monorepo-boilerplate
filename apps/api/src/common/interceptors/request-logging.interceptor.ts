import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

interface HttpRequestLike {
  id?: string;
  method?: string;
  originalUrl?: string;
  url?: string;
}

interface HttpResponseLike {
  statusCode?: number;
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(RequestLoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<HttpRequestLike>();
    const response = httpContext.getResponse<HttpResponseLike>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.info({
            requestId: request.id ?? '',
            req: {
              method: request.method ?? 'UNKNOWN',
              url: request.originalUrl ?? request.url ?? '',
            },
            res: {
              statusCode: response.statusCode ?? 200,
            },
            responseTime: Date.now() - startedAt,
          });
        },
        error: () => {
          this.logger.warn({
            requestId: request.id ?? '',
            req: {
              method: request.method ?? 'UNKNOWN',
              url: request.originalUrl ?? request.url ?? '',
            },
            res: {
              statusCode: response.statusCode ?? 500,
            },
            responseTime: Date.now() - startedAt,
          });
        },
      }),
    );
  }
}
