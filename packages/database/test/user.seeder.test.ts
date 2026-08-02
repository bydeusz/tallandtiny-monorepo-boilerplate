import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { seedUsers } from '../prisma/seeders/user.seeder.js';
import { SEED_PASSWORD, SEED_USER_COUNT } from '../src/seed-data.js';

type UpsertArgs = {
  where: Record<string, unknown>;
  create: Record<string, unknown>;
  update: Record<string, unknown>;
};

function buildPrismaMock() {
  const user = {
    upsert: vi.fn((args: UpsertArgs) => ({
      id: `id-${String(args.create.email)}`,
      ...args.create,
    })),
  };
  const organisationMember = {
    upsert: vi.fn((_args: UpsertArgs) => ({})),
  };
  return { user, organisationMember };
}

describe('seedUsers', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(() => {
    prisma = buildPrismaMock();
  });

  it('upserts every seeded user and gives each one a membership', async () => {
    await seedUsers(prisma as never);

    expect(prisma.user.upsert).toHaveBeenCalledTimes(SEED_USER_COUNT);
    expect(prisma.organisationMember.upsert).toHaveBeenCalledTimes(
      SEED_USER_COUNT,
    );
  });

  it('keys users on email and memberships on the (user, organisation) pair', async () => {
    await seedUsers(prisma as never);

    const userArgs = prisma.user.upsert.mock.calls[0][0];
    expect(Object.keys(userArgs.where)).toEqual(['email']);

    const memberArgs = prisma.organisationMember.upsert.mock.calls[0][0];
    expect(memberArgs.where).toHaveProperty('userId_organisationId');
  });

  it('clears the invite flags so a re-seeded account can log in again', async () => {
    await seedUsers(prisma as never);

    const { update } = prisma.user.upsert.mock.calls[0][0];

    expect(update.mustChangePassword).toBe(false);
    expect(update.temporaryPasswordExpiresAt).toBeNull();
    expect(update.isActive).toBe(true);
  });

  it('stores a bcrypt hash of the seed password, never the plaintext', async () => {
    await seedUsers(prisma as never);

    const { create, update } = prisma.user.upsert.mock.calls[0][0];

    expect(create.password).not.toBe(SEED_PASSWORD);
    expect(await bcrypt.compare(SEED_PASSWORD, create.password as string)).toBe(
      true,
    );
    expect(update.password).toBe(create.password);
  });

  it('hashes the shared password once rather than per user', async () => {
    const hashSpy = vi.spyOn(bcrypt, 'hash');

    await seedUsers(prisma as never);

    expect(hashSpy).toHaveBeenCalledTimes(1);
  });
});
