import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { seedSuperAdmin } from './seed-super-admin.js';

type UpsertArgs = {
  where: { email: string };
  create: Record<string, unknown>;
  update: Record<string, unknown>;
};

function buildPrismaMock() {
  const upsert = vi.fn((args: UpsertArgs) => ({
    id: 'generated-id',
    ...args.create,
  }));
  return { user: { upsert } };
}

describe('seedSuperAdmin', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(() => {
    prisma = buildPrismaMock();
  });

  it('upserts a single super admin keyed by email (idempotent — no duplicate)', async () => {
    await seedSuperAdmin(prisma as never, {
      email: 'root@example.com',
      password: 'Sup3rSecret!',
    });

    expect(prisma.user.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.user.upsert.mock.calls[0][0].where).toEqual({
      email: 'root@example.com',
    });
  });

  it('creates an active SUPER_ADMIN that can log in immediately', async () => {
    await seedSuperAdmin(prisma as never, {
      email: 'root@example.com',
      password: 'Sup3rSecret!',
    });

    const { create } = prisma.user.upsert.mock.calls[0][0];
    expect(create.role).toBe('SUPER_ADMIN');
    expect(create.isActive).toBe(true);
    expect(create.mustChangePassword).toBe(false);
    expect(create.password).not.toBe('Sup3rSecret!');
    expect(await bcrypt.compare('Sup3rSecret!', create.password as string)).toBe(
      true,
    );
  });

  it('re-asserts SUPER_ADMIN + active on an existing account (update branch)', async () => {
    await seedSuperAdmin(prisma as never, {
      email: 'root@example.com',
      password: 'Sup3rSecret!',
    });

    const { update } = prisma.user.upsert.mock.calls[0][0];
    expect(update.role).toBe('SUPER_ADMIN');
    expect(update.isActive).toBe(true);
  });

  it('normalises the email (trim + lowercase)', async () => {
    await seedSuperAdmin(prisma as never, {
      email: '  ROOT@Example.com  ',
      password: 'Sup3rSecret!',
    });

    expect(prisma.user.upsert.mock.calls[0][0].where).toEqual({
      email: 'root@example.com',
    });
  });

  it('throws when email or password is missing', async () => {
    await expect(
      seedSuperAdmin(prisma as never, { email: '', password: 'x' }),
    ).rejects.toThrow();
    await expect(
      seedSuperAdmin(prisma as never, { email: 'a@example.com', password: '' }),
    ).rejects.toThrow();
  });
});
