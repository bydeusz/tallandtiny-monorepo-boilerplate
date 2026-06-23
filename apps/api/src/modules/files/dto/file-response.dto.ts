import { BaseEntityDto } from '../../../common/dto';

export class FileResponseDto extends BaseEntityDto {
  originalName!: string;
  mimeType!: string;
  size!: number;
  folder!: string;
  scope!: string;
  userId!: string;
  organisationId!: string | null;
  downloadUrl!: string;
}
