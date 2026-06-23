import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from '../../mail';
import type { SendMailOptions } from '../../mail';
import { MAIL_JOB_SEND, MAIL_QUEUE } from '../constants/queue.constants';

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);
  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<Record<string, unknown>>): Promise<void> {
    switch (job.name) {
      case MAIL_JOB_SEND:
        await this.handleSendMail(job);
        return;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleSendMail(
    job: Job<Record<string, unknown>>,
  ): Promise<void> {
    this.logger.log(`Processing mail job ${job.id}`);

    const { to, subject, template, context, attachments } =
      job.data as Partial<SendMailOptions>;

    if (
      !this.isValidRecipients(to) ||
      typeof subject !== 'string' ||
      typeof template !== 'string'
    ) {
      throw new Error(`Invalid payload for mail job ${job.id}`);
    }

    await this.mailService.sendMail({
      to,
      subject,
      template,
      context,
      attachments,
    });
  }

  private isValidRecipients(value: unknown): value is string | string[] {
    return (
      typeof value === 'string' ||
      (Array.isArray(value) &&
        value.length > 0 &&
        value.every((recipient) => typeof recipient === 'string'))
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    const jobId = job?.id ?? 'unknown';
    this.logger.error(`Job ${jobId} failed: ${error.message}`, error.stack);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`Job ${job.id} completed`);
  }
}
