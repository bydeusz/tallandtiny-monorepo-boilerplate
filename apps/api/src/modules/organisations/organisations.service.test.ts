import { OrganisationRole } from '@repo/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganisationsService } from './organisations.service';

const orgRow = {
  id: 'org-1',
  name: 'Acme',
  address: null,
  postalCode: null,
  city: null,
  kvk: null,
  vatNumber: null,
  iban: null,
  logoUrl: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

function buildService(overrides: Record<string, unknown> = {}) {
  const tx = {
    organisation: { create: vi.fn().mockResolvedValue(orgRow) },
    organisationMember: { create: vi.fn().mockResolvedValue({}) },
    user: { create: vi.fn() },
  };
  const prisma = {
    $transaction: vi.fn(
      (arg: unknown[] | ((t: typeof tx) => unknown)) =>
        Array.isArray(arg) ? Promise.all(arg) : arg(tx),
    ),
    organisation: {
      findUnique: vi.fn().mockResolvedValue({ ...orgRow, _count: { members: 1 } }),
    },
    organisationMember: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ...overrides,
  };
  const storageService = { extractKeyFromUrl: vi.fn(), getSignedUrl: vi.fn() };
  const configService = { get: vi.fn() };
  const queueService = { addMailJob: vi.fn() };
  const usersService = { findByEmail: vi.fn() };

  const service = new OrganisationsService(
    prisma as never,
    storageService as never,
    configService as never,
    queueService as never,
    usersService as never,
  );
  return { service, prisma, tx, queueService, usersService, configService };
}

describe('OrganisationsService — create/list/get', () => {
  let h: ReturnType<typeof buildService>;

  beforeEach(() => {
    h = buildService();
  });

  it('creates an organisation and makes the creator an OWNER (in a transaction)', async () => {
    const result = await h.service.createOrganisation('user-1', { name: 'Acme' });

    expect(h.prisma.$transaction).toHaveBeenCalledOnce();
    expect(h.tx.organisation.create).toHaveBeenCalledWith({
      data: { name: 'Acme' },
    });
    expect(h.tx.organisationMember.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        organisationId: 'org-1',
        role: OrganisationRole.OWNER,
      },
    });
    expect(result.role).toBe(OrganisationRole.OWNER);
    expect(result.id).toBe('org-1');
    expect(result.memberCount).toBe(1);
  });

  it('lists only the organisations the user belongs to, with their role', async () => {
    h.prisma.organisationMember.findMany.mockResolvedValue([
      { role: OrganisationRole.OWNER, organisation: { ...orgRow, _count: { members: 3 } } },
    ]);
    h.prisma.organisationMember.count.mockResolvedValue(1);

    const result = await h.service.findAllForUser('user-1', { page: 1, limit: 10 });

    expect(h.prisma.organisationMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0].role).toBe(OrganisationRole.OWNER);
    expect(result.data[0].memberCount).toBe(3);
    expect(result.meta.total).toBe(1);
  });

  it('returns a single organisation with the caller role', async () => {
    const result = await h.service.findOne('org-1', OrganisationRole.MEMBER);

    expect(h.prisma.organisation.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'org-1' } }),
    );
    expect(result.role).toBe(OrganisationRole.MEMBER);
    expect(result.memberCount).toBe(1);
  });
});
