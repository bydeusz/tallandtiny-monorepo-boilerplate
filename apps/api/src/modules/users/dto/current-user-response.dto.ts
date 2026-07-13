import { Role } from '@repo/database';
import { UserResponseDto } from './user-response.dto';

/**
 * The authenticated user's own profile, returned by `/auth/me`. Extends the
 * public user shape with the platform `role` so the dashboard can gate on
 * `SUPER_ADMIN`. Role is deliberately NOT part of `UserResponseDto`, so it is
 * never exposed through the shared user list/detail endpoints.
 */
export class CurrentUserResponseDto extends UserResponseDto {
  role!: Role;
}
