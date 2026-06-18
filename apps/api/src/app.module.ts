import { Module } from '@nestjs/common';
import { MinisModule } from './minis/minis.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, MinisModule],
})
export class AppModule {}
