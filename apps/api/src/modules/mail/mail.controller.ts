import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Express } from 'express';
import { Queue } from 'bullmq';
import { CurrentUser } from '../../common/decorators';
import { MessageResponseDto } from '../auth/dto/auth-response.dto';
import { MAIL_JOB_SEND, MAIL_QUEUE } from '../queue/constants/queue.constants';
import { ContactSupportDto } from './dto';
import type { MailAttachment } from './interfaces/send-mail-options.interface';

const MAX_ATTACHMENT_SIZE_BYTES = 3 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
]);

@Controller('mail')
@ApiTags('Mail')
@ApiBearerAuth()
export class MailController {
  constructor(
    private readonly configService: ConfigService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
  ) {}

  @ApiOperation({ operationId: 'MailContactSupport' })
  @Post('contact')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('attachment'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'email', 'subject', 'message'],
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        subject: { type: 'string' },
        message: { type: 'string' },
        attachment: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async contactSupport(
    @Body() dto: ContactSupportDto,
    @CurrentUser('sub') userId: string | undefined,
    @CurrentUser('email') currentUserEmail: string | undefined,
    @UploadedFile() attachment?: Express.Multer.File,
  ): Promise<MessageResponseDto> {
    if (!userId || !currentUserEmail) {
      throw new ForbiddenException('Authentication is required.');
    }

    if (dto.email.toLowerCase() !== currentUserEmail.toLowerCase()) {
      throw new ForbiddenException(
        'Support email must be sent from the authenticated account.',
      );
    }

    const supportEmail = this.configService.get<string>(
      'mail.supportEmail',
      'support@example.com',
    );

    const attachments = this.toAttachments(attachment);

    await this.mailQueue.add(
      MAIL_JOB_SEND,
      {
        to: supportEmail,
        subject: `[Support] ${dto.subject}`,
        template: 'support-contact',
        context: {
          name: dto.name,
          email: dto.email,
          subject: dto.subject,
          message: dto.message,
        },
        attachments,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      },
    );

    return { message: 'Support request has been queued.' };
  }

  private toAttachments(
    attachment: Express.Multer.File | undefined,
  ): MailAttachment[] | undefined {
    if (!attachment) {
      return undefined;
    }

    if (!ALLOWED_ATTACHMENT_TYPES.has(attachment.mimetype)) {
      throw new BadRequestException(
        'Attachment must be a jpg, jpeg, png, or gif image.',
      );
    }

    if (attachment.size > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new BadRequestException('Attachment file size cannot exceed 3MB.');
    }

    return [
      {
        filename: attachment.originalname,
        content: attachment.buffer.toString('base64'),
        contentType: attachment.mimetype,
      },
    ];
  }
}
