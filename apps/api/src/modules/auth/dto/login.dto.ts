import { Exclude } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @Exclude({ toPlainOnly: true })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
