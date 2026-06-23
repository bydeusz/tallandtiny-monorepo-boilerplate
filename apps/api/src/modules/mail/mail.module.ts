import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MAIL_QUEUE } from '../queue/constants/queue.constants';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';

@Module({
  imports: [BullModule.registerQueue({ name: MAIL_QUEUE })],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
