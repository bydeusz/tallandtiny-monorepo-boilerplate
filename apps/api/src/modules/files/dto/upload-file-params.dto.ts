import { IsIn, IsString, IsUUID } from 'class-validator';

export class UploadFileParamsDto {
  @IsString()
  @IsIn(['user'])
  scope!: 'user';

  @IsUUID()
  ownerId!: string;

  @IsString()
  folder!: string;
}
