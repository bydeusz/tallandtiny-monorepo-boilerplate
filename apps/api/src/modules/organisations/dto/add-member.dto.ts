import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AddMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  // Required only when the email does not yet belong to an account — the
  // service creates a new user (temp-password invite) and needs these.
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  surname?: string;
}
