import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrganisationRole } from '@repo/database';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: OrganisationRole, enumName: 'OrganisationRole' })
  @IsEnum(OrganisationRole)
  role!: OrganisationRole;
}
