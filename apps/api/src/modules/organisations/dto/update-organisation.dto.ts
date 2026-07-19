import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateOrganisationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  city?: string;

  @IsOptional()
  @Matches(/^\d{8}$/)
  kvk?: string;

  @IsOptional()
  @Matches(/^[A-Z]{2}[0-9A-Z]{2,12}$/)
  vatNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(34)
  iban?: string;
}
