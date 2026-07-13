import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { Role } from '@repo/database';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route (or controller) to one or more platform roles. Enforced by
 * `RolesGuard`, which reads the authenticated user's role from the JWT payload.
 */
export const Roles = (...roles: Role[]): CustomDecorator =>
  SetMetadata(ROLES_KEY, roles);
