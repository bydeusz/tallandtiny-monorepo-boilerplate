import { prisma, Role, seedSuperAdmin } from '@repo/database';
import bcrypt from 'bcrypt';
import { afterAll, describe, expect, it } from 'vitest';

const email = `super-admin-${Date.now()}@example.com`;

describe('seedSuperAdmin (integration)', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it('is idempotent — running twice keeps a single account', async () => {
    await seedSuperAdmin(prisma, { email, password: 'FirstPass1!' });
    await seedSuperAdmin(prisma, { email, password: 'SecondPass2!' });

    const users = await prisma.user.findMany({ where: { email } });

    expect(users).toHaveLength(1);
  });

  it('produces a login-ready SUPER_ADMIN', async () => {
    await seedSuperAdmin(prisma, { email, password: 'SecondPass2!' });

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });

    expect(user.role).toBe(Role.SUPER_ADMIN);
    expect(user.isActive).toBe(true);
    expect(user.mustChangePassword).toBe(false);
    expect(await bcrypt.compare('SecondPass2!', user.password)).toBe(true);
  });
});
