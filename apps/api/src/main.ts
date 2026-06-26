import 'dotenv/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { requestIdMiddleware } from './common/middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('apiPrefix') ?? 'api';
  const port = configService.get<number>('port') ?? 3001;
  const nodeEnv = configService.get<string>('nodeEnv') ?? 'development';
  const isProduction = nodeEnv === 'production';

  app.use(helmet(isProduction ? undefined : { contentSecurityPolicy: false }));
  app.use(requestIdMiddleware);
  app.enableCors({
    origin: configService.get<string | string[]>('cors.origins'),
    methods: configService.get<string>('cors.methods'),
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: configService.get<number>('cors.maxAge'),
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Tall & Tiny API')
      .setDescription('API for Tall & Tiny — a tool for miniature painters')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const swaggerDocumentFactory = () =>
      SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, swaggerDocumentFactory, {
      jsonDocumentUrl: `${apiPrefix}/docs-json`,
    });
  }

  await app.listen(port);

  const logger = app.get(Logger);
  const base = `http://localhost:${port}`;
  logger.log('🎨 Tall & Tiny API ready');
  logger.log(`├─ API:        ${base}/${apiPrefix}/v1`);
  logger.log(`├─ Swagger UI: ${base}/${apiPrefix}/docs`);
  logger.log(`└─ OpenAPI:    ${base}/${apiPrefix}/docs-json`);
}
void bootstrap();
