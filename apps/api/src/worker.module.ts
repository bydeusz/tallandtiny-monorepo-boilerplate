import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from './common/logger';
import { GracefulShutdownService } from './common/services/graceful-shutdown.service';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { MailModule } from './modules/mail';
import { QueueModule } from './modules/queue/queue.module';
import { RedisModule } from './modules/redis';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      load: [configuration],
      cache: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
        },
      }),
    }),
    LoggerModule,
    PrismaModule,
    RedisModule,
    MailModule,
    QueueModule.register('worker'),
  ],
  providers: [GracefulShutdownService],
})
export class WorkerModule {}
