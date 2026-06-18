import { Module } from '@nestjs/common';
import { MinisController } from './minis.controller';
import { MinisService } from './minis.service';

@Module({
  controllers: [MinisController],
  providers: [MinisService],
})
export class MinisModule {}
