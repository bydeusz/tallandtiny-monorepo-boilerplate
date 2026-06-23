export interface MailAttachment {
  filename: string;
  content: string;
  contentType: string;
}

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  template: string;
  context?: Record<string, unknown>;
  attachments?: MailAttachment[];
}
