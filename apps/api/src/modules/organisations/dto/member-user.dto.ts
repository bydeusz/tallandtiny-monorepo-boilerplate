import { BaseEntityDto } from '../../../common/dto';

/**
 * Narrow projection of a user as embedded in
 * `OrganisationMemberResponseDto`. Deliberately omits `organisationIds`
 * to avoid leaking which other organisations a fellow member belongs
 * to. The full `UserResponseDto` (with `organisationIds`) is reserved
 * for `/auth/me` and `/users/:id` when the caller is the user.
 */
export class MemberUserDto extends BaseEntityDto {
  name!: string;
  surname!: string;
  email!: string;
  isActive!: boolean;
  avatarUrl!: string | null;
}
