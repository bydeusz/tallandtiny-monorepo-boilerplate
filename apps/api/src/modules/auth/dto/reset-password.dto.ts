import { Exclude } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email!: string;

  @Exclude({ toPlainOnly: true })
  @IsString()
  @IsNotEmpty()
  temporaryPassword!: string;

  @Exclude({ toPlainOnly: true })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
