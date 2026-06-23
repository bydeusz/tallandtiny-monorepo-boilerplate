import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { MinisModule } from './minis/minis.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, HealthModule, MinisModule],
})
export class AppModule {}
