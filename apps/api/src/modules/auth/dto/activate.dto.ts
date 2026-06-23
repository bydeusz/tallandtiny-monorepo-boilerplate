import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ActivateDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;
}
