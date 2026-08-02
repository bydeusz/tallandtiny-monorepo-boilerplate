import bcrypt from 'bcrypt';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { SEED_PASSWORD, buildSeedUsers } from '../../src/seed-data.js';

// Matches SALT_ROUNDS used by hashPassword() in apps/api, so a seeded hash is
// verifiable by the app's login flow.
const SALT_ROUNDS = 10;

/**
 * Create the seeded users and attach each one to an organisation.
 *
 * Users are upserted on their unique email and memberships on the
 * (user, organisation) pair, so re-running this refreshes the existing rows
 * rather than duplicating them. Requires `seedOrganisations` to have run first.
 */
export async function seedUsers(prisma: PrismaClient): Promise<void> {
  // Hashed once and shared by every seeded user: bcrypt is deliberately slow,
  // and hashing the same password 350 times would dominate the seed runtime.
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);
  const users = buildSeedUsers();

  for (const user of users) {
    const { organisationId, organisationRole, ...profile } = user;

    const record = await prisma.user.upsert({
      where: { email: profile.email },
      update: {
        name: profile.name,
        surname: profile.surname,
        password: passwordHash,
        isActive: true,
        // An account invited through the API carries mustChangePassword, which
        // makes login fail with PasswordResetRequired. Re-seeding hands out a
        // fresh known password, so these have to be cleared as well or the
        // account still cannot log in. The platform `role` is deliberately left
        // alone: overwriting it would silently demote an account that was
        // promoted on purpose.
        mustChangePassword: false,
        temporaryPasswordExpiresAt: null,
        address: profile.address,
        postalCode: profile.postalCode,
        city: profile.city,
        country: profile.country,
        kvk: profile.kvk ?? null,
        vatNumber: profile.vatNumber ?? null,
      },
      create: {
        ...profile,
        password: passwordHash,
        isActive: true,
      },
    });

    await prisma.organisationMember.upsert({
      where: {
        userId_organisationId: { userId: record.id, organisationId },
      },
      update: { role: organisationRole },
      create: {
        userId: record.id,
        organisationId,
        role: organisationRole,
      },
    });
  }
}
