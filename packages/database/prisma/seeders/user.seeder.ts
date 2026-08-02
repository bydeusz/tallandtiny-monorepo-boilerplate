import bcrypt from 'bcrypt';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { SEED_PASSWORD, buildSeedUsers } from '../../src/seed-data.js';

const SALT_ROUNDS = 10;

export async function seedUsers(prisma: PrismaClient): Promise<void> {
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
