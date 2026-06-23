import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { MailModule } from '../mail';
import { MAIL_QUEUE } from './constants/queue.constants';
import { MailProcessor } from './processors/mail.processor';
import { QueueService } from './queue.service';

export type QueueModuleMode = 'producer' | 'worker' | 'both';

@Module({})
export class QueueModule {
  static register(mode: QueueModuleMode = 'both'): DynamicModule {
    const providers: Provider[] = [QueueService];
    const imports =
      mode !== 'producer'
        ? [BullModule.registerQueue({ name: MAIL_QUEUE }), MailModule]
        : [BullModule.registerQueue({ name: MAIL_QUEUE })];

    if (mode !== 'producer') {
      providers.push(MailProcessor);
    }

    return {
      module: QueueModule,
      imports,
      providers,
      exports: [QueueService],
    };
  }
}
