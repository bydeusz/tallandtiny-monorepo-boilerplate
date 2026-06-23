import { Module, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hostname } from 'os';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logLevel = configService.get<string>('log.level') ?? 'debug';
        const fileLoggingEnabled =
          configService.get<boolean>('log.fileEnabled') ?? false;
        const nodeEnv = configService.get<string>('nodeEnv') ?? 'development';
        const isDevelopment = nodeEnv === 'development';
        const appVersion =
          process.env.APP_VERSION ??
          process.env.npm_package_version ??
          'unknown';
        const targets = [
          ...(isDevelopment
            ? [
                {
                  target: 'pino-pretty',
                  level: logLevel,
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'SYS:standard',
                  },
                },
              ]
            : [
                {
                  target: 'pino/file',
                  level: logLevel,
                  options: { destination: 1 },
                },
              ]),
          ...(fileLoggingEnabled
            ? [
                {
                  target: 'pino-roll',
                  level: logLevel,
                  options: {
                    file: 'logs/app',
                    frequency: 'daily',
                    dateFormat: 'yyyy-MM-dd',
                    limit: { count: 14 },
                    mkdir: true,
                  },
                },
              ]
            : []),
        ];

        return {
          forRoutes: [{ path: '*path', method: RequestMethod.ALL }],
          pinoHttp: {
            genReqId: (req) => req.id,
            level: logLevel,
            autoLogging: {
              ignore: (req) => {
                const requestPath = req.url ?? '';
                return (
                  requestPath.endsWith('/health') ||
                  requestPath.includes('/health?')
                );
              },
            },
            base: {
              pid: process.pid,
              hostname: hostname(),
              env: nodeEnv,
              version: appVersion,
            },
            redact: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.currentPassword',
              'req.body.newPassword',
              'req.body.token',
              'req.body.refreshToken',
            ],
            serializers: {
              err: (error: unknown) => {
                if (!(error instanceof Error)) {
                  return error;
                }

                const rawCode = (error as Error & { code?: unknown }).code;
                const errorCode =
                  typeof rawCode === 'string' ? rawCode : undefined;

                return {
                  type: error.name,
                  message: error.message,
                  stack: error.stack,
                  ...(errorCode ? { code: errorCode } : {}),
                };
              },
            },
            transport: {
              targets,
            },
          },
        };
      },
    }),
  ],
})
export class LoggerModule {}
