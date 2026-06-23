import { IsEmail } from 'class-validator';

export class RequestNewPasswordDto {
  @IsEmail()
  email!: string;
}
