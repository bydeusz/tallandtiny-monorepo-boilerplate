import { Exclude } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmEmailChangeDto {
  @Exclude({ toPlainOnly: true })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
