import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { OrganisationRole } from '@repo/database';

export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    enum: OrganisationRole,
    enumName: 'OrganisationRole',
    default: OrganisationRole.MEMBER,
  })
  @IsOptional()
  @IsEnum(OrganisationRole)
  role?: OrganisationRole;

  @ApiPropertyOptional({
    description:
      'Required when the email does not match an existing user; ignored otherwise.',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description:
      'Required when the email does not match an existing user; ignored otherwise.',
  })
  @IsOptional()
  @IsString()
  surname?: string;
}
