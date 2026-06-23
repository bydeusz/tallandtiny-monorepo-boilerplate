import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StorageFile } from './storage.interface';

@Injectable()
export class StorageService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;

  constructor(private readonly configService: ConfigService) {
    this.endpoint = this.configService.get<string>(
      'storage.endpoint',
      'http://localhost:9000',
    );

    const accessKey =
      this.configService.getOrThrow<string>('storage.accessKey');
    const secretKey =
      this.configService.getOrThrow<string>('storage.secretKey');
    this.bucket = this.configService.get<string>('storage.bucket', 'uploads');

    this.s3Client = new S3Client({
      endpoint: this.endpoint,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBucketExists();
  }

  onModuleDestroy(): void {
    this.logger.log('Closing S3 client...');
    this.s3Client.destroy();
    this.logger.log('S3 client closed');
  }

  async upload(
    file: Express.Multer.File,
    folder: string,
    entityId: string,
  ): Promise<StorageFile> {
    const cleanName = this.sanitizeFilename(file.originalname);
    const key = `${folder}/${entityId}/${Date.now()}-${cleanName}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentDisposition: this.buildContentDisposition(cleanName),
      }),
    );

    return {
      key,
      url: this.getPublicUrl(key),
    };
  }

  async uploadWithKey(
    file: Express.Multer.File,
    key: string,
  ): Promise<StorageFile> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentDisposition: this.buildContentDisposition(
          this.sanitizeFilename(file.originalname),
        ),
      }),
    );

    return {
      key,
      url: this.getPublicUrl(key),
    };
  }

  async delete(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async getSignedUrl(key: string, expiresIn = 900): Promise<string> {
    return getSignedUrl(
      this.s3Client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: 'attachment',
      }),
      { expiresIn },
    );
  }

  getPublicUrl(key: string): string {
    const normalizedEndpoint = this.endpoint.replace(/\/+$/, '');
    return `${normalizedEndpoint}/${this.bucket}/${key}`;
  }

  extractKeyFromUrl(url: string): string {
    const normalizedEndpoint = this.endpoint.replace(/\/+$/, '');
    const prefix = `${normalizedEndpoint}/${this.bucket}/`;

    if (url.startsWith(prefix)) {
      return url.slice(prefix.length);
    }

    const fallbackPrefix = `/${this.bucket}/`;
    const index = url.indexOf(fallbackPrefix);

    if (index >= 0) {
      return url.slice(index + fallbackPrefix.length);
    }

    return url;
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.s3Client.send(
        new CreateBucketCommand({ Bucket: this.bucket }),
      );
      this.logger.log(`Created storage bucket "${this.bucket}"`);
    }
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private buildContentDisposition(filename: string): string {
    return `attachment; filename="${filename}"`;
  }
}
