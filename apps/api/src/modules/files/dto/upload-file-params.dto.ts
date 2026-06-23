import { IsIn, IsString, IsUUID } from 'class-validator';

export class UploadFileParamsDto {
  @IsIn(['user', 'organisation'])
  scope!: 'user' | 'organisation';

  @IsUUID()
  ownerId!: string;

  @IsString()
  folder!: string;
}
