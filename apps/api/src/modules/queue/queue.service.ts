import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import { MAIL_QUEUE } from './constants/queue.constants';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);

  constructor(@InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue) {}

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing mail queue connection...');
    await this.mailQueue.close();
    this.logger.log('Mail queue connection closed');
  }

  async addMailJob(
    name: string,
    data: Record<string, unknown>,
    options?: JobsOptions,
  ): Promise<void> {
    await this.mailQueue.add(name, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      ...options,
    });
  }
}
