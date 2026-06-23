import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Handlebars from 'handlebars';
import nodemailer, {
  type SendMailOptions as NodemailerSendMailOptions,
  type Transporter,
} from 'nodemailer';
import type {
  MailAttachment,
  SendMailOptions,
} from './interfaces/send-mail-options.interface';

interface SendRawMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly templatesPath = join(__dirname, 'templates');

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('nodeEnv', 'development');
    const host = this.configService.get<string>('mail.host', 'localhost');
    const port = this.configService.get<number>('mail.port', 1025);
    const configuredSecure = this.toBoolean(
      this.configService.get<unknown>('mail.secure', false),
    );
    const secure = nodeEnv === 'production' ? configuredSecure : false;
    const ignoreTLS = nodeEnv === 'production' ? !secure : true;
    const user = this.configService.get<string>('mail.user', '');
    const password = this.configService.get<string>('mail.password', '');

    this.from = this.configService.get<string>(
      'mail.from',
      'noreply@example.com',
    );

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      ignoreTLS,
      auth: user && password ? { user, pass: password } : undefined,
    });

    this.logger.log(
      `Mail transport configured: host=${host}, port=${port}, secure=${secure}, ignoreTLS=${ignoreTLS}, env=${nodeEnv}`,
    );
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`SMTP verification failed: ${message}`);
    }
  }

  onModuleDestroy(): void {
    this.logger.log('Closing SMTP transporter...');
    this.transporter.close();
    this.logger.log('SMTP transporter closed');
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    const html = await this.renderTemplate(options.template, options.context);

    await this.transporter.sendMail({
      from: this.from,
      to: options.to,
      subject: options.subject,
      html,
      attachments: this.mapAttachments(options.attachments),
    });
  }

  async sendRawMail(options: SendRawMailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  }

  private async renderTemplate(
    templateName: string,
    context: Record<string, unknown> = {},
  ): Promise<string> {
    const templatePath = join(this.templatesPath, `${templateName}.hbs`);
    const templateFile = await readFile(templatePath, 'utf-8');
    const template = Handlebars.compile(templateFile);

    return template(context);
  }

  private mapAttachments(
    attachments: MailAttachment[] | undefined,
  ): NodemailerSendMailOptions['attachments'] {
    if (!attachments?.length) {
      return undefined;
    }

    return attachments.map((attachment) => ({
      filename: attachment.filename,
      content: Buffer.from(attachment.content, 'base64'),
      contentType: attachment.contentType,
    }));
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === '1';
    }

    return false;
  }
}
