import { IsEnum } from 'class-validator';
import { OrganisationRole } from '@repo/database';

export class ChangeMemberRoleDto {
  @IsEnum(OrganisationRole)
  role!: OrganisationRole;
}
