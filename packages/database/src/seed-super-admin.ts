import bcrypt from 'bcrypt';
import type { PrismaClient, Role, User } from './generated/prisma/client.js';

// Matches SALT_ROUNDS used by hashPassword() in apps/api, so a seeded hash is
// verifiable by the app's login flow (bcrypt.compare is agnostic to rounds).
const SALT_ROUNDS = 10;
const SUPER_ADMIN_ROLE: Role = 'SUPER_ADMIN';

export interface SuperAdminCredentials {
  email: string;
  password: string;
  name?: string;
  surname?: string;
}

/**
 * Idempotently create (or update) the platform super admin.
 *
 * Keyed by the unique email, so running it repeatedly never produces a
 * duplicate: a missing account is created ready to log in, an existing one is
 * (re)promoted to SUPER_ADMIN and reactivated. There is deliberately no public
 * route for this — credentials come from the environment only, which both
 * solves the bootstrap problem and prevents privilege escalation via the API.
 */
export async function seedSuperAdmin(
  prisma: PrismaClient,
  credentials: SuperAdminCredentials,
): Promise<User> {
  const email = (credentials.email ?? '').trim().toLowerCase();
  const password = credentials.password ?? '';

  if (!email || !password) {
    throw new Error(
      'seedSuperAdmin requires both an email and a password (set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD).',
    );
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  return prisma.user.upsert({
    where: { email },
    update: {
      password: passwordHash,
      role: SUPER_ADMIN_ROLE,
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      email,
      name: credentials.name ?? 'Super',
      surname: credentials.surname ?? 'Admin',
      password: passwordHash,
      role: SUPER_ADMIN_ROLE,
      isActive: true,
      mustChangePassword: false,
    },
  });
}
