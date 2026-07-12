import { Role } from '@repo/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersService } from './users.service';

const fullUser = {
  id: 'user-1',
  name: 'Ada',
  surname: 'Lovelace',
  email: 'ada@bydeusz.com',
  role: Role.SUPER_ADMIN,
  isActive: true,
  avatarUrl: null,
  address: null,
  postalCode: null,
  city: null,
  country: null,
  kvk: null,
  vatNumber: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
} as const;

// A findUnique mock that honours the `select` argument, so the test genuinely
// exercises whether `role` is part of the service's select projection.
function projectBySelect(args: {
  select?: Record<string, boolean>;
}): Record<string, unknown> {
  const { select } = args;
  if (!select) return { ...fullUser };
  const picked: Record<string, unknown> = {};
  for (const [key, include] of Object.entries(select)) {
    if (include) picked[key] = (fullUser as Record<string, unknown>)[key];
  }
  return picked;
}

function buildService() {
  const prisma = {
    user: { findUnique: vi.fn(projectBySelect) },
  };
  const storageService = {
    extractKeyFromUrl: vi.fn(),
    getSignedUrl: vi.fn(),
  };
  const cacheManager = { clear: vi.fn() };

  const service = new UsersService(
    prisma as never,
    storageService as never,
    cacheManager as never,
  );

  return { service, prisma };
}

describe('UsersService — role is exposed via findOne (/auth/me)', () => {
  let h: ReturnType<typeof buildService>;

  beforeEach(() => {
    h = buildService();
  });

  it('returns the role for the requested user', async () => {
    const result = await h.service.findOne('user-1');

    expect(result.role).toBe(Role.SUPER_ADMIN);
  });
});
