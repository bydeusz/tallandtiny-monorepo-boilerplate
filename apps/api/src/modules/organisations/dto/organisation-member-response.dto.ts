import { ApiProperty } from '@nestjs/swagger';
import { BaseEntityDto } from '../../../common/dto';
import { OrganisationRole } from '@repo/database';
import { MemberUserDto } from './member-user.dto';

export class OrganisationMemberResponseDto extends BaseEntityDto {
  userId!: string;
  organisationId!: string;

  @ApiProperty({ enum: OrganisationRole, enumName: 'OrganisationRole' })
  role!: OrganisationRole;

  @ApiProperty({ type: MemberUserDto })
  user!: MemberUserDto;
}
