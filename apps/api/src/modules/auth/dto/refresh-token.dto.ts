import { Exclude } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @Exclude({ toPlainOnly: true })
  @IsString()
  @IsNotEmpty()
  refresh_token!: string;
}
