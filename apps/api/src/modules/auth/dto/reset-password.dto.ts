import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  temporaryPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
