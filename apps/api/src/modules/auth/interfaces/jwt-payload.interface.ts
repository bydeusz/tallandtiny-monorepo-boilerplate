import { Role } from '@repo/database';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}
