import { IsIn, IsString, IsUUID } from 'class-validator';

export class UploadFileParamsDto {
  @IsIn(['user'])
  scope!: 'user';

  @IsUUID()
  ownerId!: string;

  @IsString()
  folder!: string;
}
