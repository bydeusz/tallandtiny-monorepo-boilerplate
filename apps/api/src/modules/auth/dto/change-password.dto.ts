import { Exclude } from 'class-transformer';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @Exclude({ toPlainOnly: true })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @Exclude({ toPlainOnly: true })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
