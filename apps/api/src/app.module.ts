import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { createKeyv } from '@keyv/redis';
import { GracefulShutdownService } from './common/services/graceful-shutdown.service';
import { JwtAuthGuard } from './common/guards';
import {
  RequestLoggingInterceptor,
  TransformInterceptor,
} from './common/interceptors';
import { AllExceptionsFilter } from './common/filters';
import { LoggerModule } from './common/logger';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { FilesModule } from './modules/files';
import { HealthModule } from './modules/health';
import { MailModule } from './modules/mail';
import { OrganisationsModule } from './modules/organisations/organisations.module';
import { QueueModule } from './modules/queue/queue.module';
import { RedisModule } from './modules/redis';
import { StorageModule } from './modules/storage';
import { UsersModule } from './modules/users/users.module';
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
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('redis.host', 'localhost');
        const port = configService.get<number>('redis.port', 6379);
        const ttl = configService.get<number>('cache.ttl', 60000);

        return {
          stores: [createKeyv(`redis://${host}:${port}`)],
          ttl,
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('throttle.ttl', 60000),
            limit: configService.get<number>('throttle.limit', 60),
          },
        ],
      }),
    }),
    LoggerModule,
    PrismaModule,
    StorageModule,
    RedisModule,
    QueueModule.register('producer'),
    AuthModule,
    FilesModule,
    HealthModule,
    MailModule,
    OrganisationsModule,
    UsersModule,
  ],
  providers: [
    GracefulShutdownService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
