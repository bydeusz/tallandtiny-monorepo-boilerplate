import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

/**
 * Wrap a URL in an OSC 8 terminal hyperlink so it's clickable in supporting
 * terminals (iTerm2, VS Code, Warp, etc.). Falls back to the plain URL when
 * stdout isn't a TTY (piped output, turbo, CI) to keep logs clean.
 *
 * Sequence: ESC ] 8 ; ; <url> BEL <text> ESC ] 8 ; ; BEL
 */
function terminalLink(url: string): string {
  if (!process.stdout.isTTY) return url;
  const ESC = String.fromCharCode(27);
  const BEL = String.fromCharCode(7);
  const open = `${ESC}]8;;${url}${BEL}`;
  const close = `${ESC}]8;;${BEL}`;
  return `${open}${url}${close}`;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({ origin: 'http://localhost:3000' });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const config = new DocumentBuilder()
    .setTitle('Tintsmith API')
    .setDescription('API for tintsmith — a tool for miniature painters')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (_controllerKey: string, methodKey: string) =>
      methodKey,
  });

  SwaggerModule.setup('api/docs', app, document);

  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  const base = `http://localhost:${port}`;
  console.log(`\n  🎨 Tintsmith API ready`);
  console.log(`  ├─ API:          ${terminalLink(`${base}/api`)}`);
  console.log(`  ├─ Swagger UI:   ${terminalLink(`${base}/api/docs`)}`);
  console.log(`  └─ OpenAPI JSON: ${terminalLink(`${base}/api/docs-json`)}\n`);
}

void bootstrap();
