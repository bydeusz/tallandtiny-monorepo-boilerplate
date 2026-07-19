import { OrganisationRole } from '@repo/database';

export class OrganisationMemberResponseDto {
  userId!: string;
  name!: string;
  surname!: string;
  email!: string;
  role!: OrganisationRole;
  createdAt!: Date;
}
