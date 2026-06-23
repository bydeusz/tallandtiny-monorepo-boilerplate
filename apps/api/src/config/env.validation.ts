import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
  Fatal = 'fatal',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(0)
  @Max(65535)
  PORT: number = 3001;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number = 6379;

  @IsNumber()
  @IsOptional()
  @Min(0)
  CACHE_TTL: number = 60000;

  @IsString()
  @IsOptional()
  SMTP_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  SMTP_PORT: number = 1025;

  @IsBoolean()
  @IsOptional()
  SMTP_SECURE: boolean = false;

  @IsString()
  @IsOptional()
  SMTP_USER: string = '';

  @IsString()
  @IsOptional()
  SMTP_PASSWORD: string = '';

  @IsString()
  @IsOptional()
  MAIL_FROM: string = 'noreply@example.com';

  @IsEmail()
  @IsOptional()
  SUPPORT_EMAIL: string = 'support@example.com';

  @IsString()
  @IsOptional()
  S3_ENDPOINT: string = 'http://localhost:9000';

  @IsString()
  @IsNotEmpty()
  S3_ACCESS_KEY: string;

  @IsString()
  @IsNotEmpty()
  S3_SECRET_KEY: string;

  @IsString()
  @IsOptional()
  S3_BUCKET: string = 'uploads';

  @IsString()
  @IsOptional()
  API_PREFIX: string = 'api';

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN: string;

  @IsEnum(LogLevel)
  @IsOptional()
  LOG_LEVEL: LogLevel = LogLevel.Debug;

  @IsBoolean()
  @IsOptional()
  LOG_FILE_ENABLED: boolean = false;

  @IsNumber()
  @IsOptional()
  @Min(1000)
  SHUTDOWN_FORCE_EXIT_TIMEOUT_MS: number = 15000;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRATION: string = '1h';

  @IsNumber()
  @IsOptional()
  @Min(1000)
  THROTTLE_TTL: number = 60000;

  @IsNumber()
  @IsOptional()
  @Min(1)
  THROTTLE_LIMIT: number = 60;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRATION: string = '7d';

  @IsString()
  @IsNotEmpty()
  ALLOWED_EMAIL_DOMAINS: string;

  @IsBoolean()
  @IsOptional()
  REGISTRATION_ENABLED: boolean = false;

  @IsString()
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:3000';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
