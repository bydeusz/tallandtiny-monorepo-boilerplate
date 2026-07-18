import { BadRequestException, ConflictException } from '@nestjs/common';
import { OrganisationRole, Prisma } from '@repo/database';
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
  const organisationMemberMock = {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const tx = {
    organisation: { create: vi.fn().mockResolvedValue(orgRow) },
    organisationMember: organisationMemberMock,
    user: { create: vi.fn() },
  };
  const prisma = {
    $transaction: vi.fn(
      (arg: unknown[] | ((t: typeof tx) => unknown)) =>
        Array.isArray(arg) ? Promise.all(arg) : arg(tx),
    ),
    organisation: {
      findUnique: vi.fn().mockResolvedValue({ ...orgRow, _count: { members: 1 } }),
      update: vi.fn(),
    },
    organisationMember: organisationMemberMock,
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
    expect(h.prisma.$transaction).toHaveBeenCalledWith(expect.any(Array));
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

describe('OrganisationsService — update/members/invite', () => {
  let h: ReturnType<typeof buildService>;

  beforeEach(() => {
    h = buildService();
  });

  it('updates an organisation and returns it with the caller role', async () => {
    h.prisma.organisation.update = vi
      .fn()
      .mockResolvedValue({ ...orgRow, name: 'New', _count: { members: 2 } });

    const result = await h.service.update(
      'org-1',
      { name: 'New' },
      OrganisationRole.OWNER,
    );

    expect(result.name).toBe('New');
    expect(result.role).toBe(OrganisationRole.OWNER);
    expect(result.memberCount).toBe(2);
  });

  it('links an existing account as a MEMBER (no new account, no email)', async () => {
    h.usersService.findByEmail.mockResolvedValue({
      id: 'user-9',
      name: 'Existing',
      surname: 'User',
      email: 'existing@example.com',
    });
    h.prisma.organisationMember.create.mockResolvedValue({
      role: OrganisationRole.MEMBER,
      createdAt: new Date('2026-02-02'),
    });

    const result = await h.service.addMember('org-1', {
      email: 'existing@example.com',
    });

    expect(h.prisma.$transaction).not.toHaveBeenCalled();
    expect(h.queueService.addMailJob).not.toHaveBeenCalled();
    expect(result.userId).toBe('user-9');
    expect(result.role).toBe(OrganisationRole.MEMBER);
  });

  it('rejects a duplicate membership with 409', async () => {
    h.usersService.findByEmail.mockResolvedValue({
      id: 'user-9',
      name: 'Existing',
      surname: 'User',
      email: 'existing@example.com',
    });
    h.prisma.organisationMember.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'x',
      }),
    );

    await expect(
      h.service.addMember('org-1', { email: 'existing@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a new account with a temp password + queues an invite email', async () => {
    h.usersService.findByEmail.mockResolvedValue(null);
    h.configService.get.mockImplementation((key: string, dflt?: unknown) => {
      if (key === 'auth.allowedEmailDomains') return ['example.com'];
      if (key === 'auth.invitePasswordTtlMs') return 72 * 60 * 60 * 1000;
      if (key === 'auth.frontendUrl') return 'http://localhost:3000';
      return dflt;
    });
    h.tx.user.create.mockResolvedValue({
      id: 'user-new',
      name: 'New',
      surname: 'Person',
      email: 'new@example.com',
    });
    h.tx.organisationMember.create.mockResolvedValue({
      role: OrganisationRole.MEMBER,
      createdAt: new Date('2026-03-03'),
    });
    h.prisma.organisation.findUnique.mockResolvedValue({ name: 'Acme' });

    const result = await h.service.addMember('org-1', {
      email: 'new@example.com',
      name: 'New',
      surname: 'Person',
    });

    expect(h.tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'new@example.com',
          isActive: true,
          mustChangePassword: true,
          password: expect.stringMatching(/^\$2[aby]\$/),
          temporaryPasswordExpiresAt: expect.any(Date),
        }),
      }),
    );
    expect(h.queueService.addMailJob).toHaveBeenCalledWith(
      'send-mail',
      expect.objectContaining({ template: 'organisation-invitation' }),
    );
    expect(result.userId).toBe('user-new');
  });

  it('rejects a new-account invite without name/surname (400)', async () => {
    h.usersService.findByEmail.mockResolvedValue(null);

    await expect(
      h.service.addMember('org-1', { email: 'new@example.com' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses to remove the last owner (409)', async () => {
    h.prisma.organisationMember.findUnique.mockResolvedValue({
      userId: 'owner-1',
      organisationId: 'org-1',
      role: OrganisationRole.OWNER,
    });
    h.prisma.organisationMember.count.mockResolvedValue(1);

    await expect(
      h.service.removeMember('org-1', 'owner-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(h.prisma.organisationMember.delete).not.toHaveBeenCalled();
  });

  it('removes a non-last member', async () => {
    h.prisma.organisationMember.findUnique.mockResolvedValue({
      userId: 'member-1',
      organisationId: 'org-1',
      role: OrganisationRole.MEMBER,
    });
    h.prisma.organisationMember.count.mockResolvedValue(1);
    h.prisma.organisationMember.delete.mockResolvedValue({});

    await h.service.removeMember('org-1', 'member-1');

    expect(h.prisma.organisationMember.delete).toHaveBeenCalledWith({
      where: {
        userId_organisationId: {
          userId: 'member-1',
          organisationId: 'org-1',
        },
      },
    });
  });

  it('refuses to demote the last owner (409)', async () => {
    h.prisma.organisationMember.findUnique.mockResolvedValue({
      userId: 'owner-1',
      organisationId: 'org-1',
      role: OrganisationRole.OWNER,
    });
    h.prisma.organisationMember.count.mockResolvedValue(1);

    await expect(
      h.service.changeMemberRole('org-1', 'owner-1', {
        role: OrganisationRole.MEMBER,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('promotes a member to OWNER', async () => {
    h.prisma.organisationMember.findUnique.mockResolvedValue({
      userId: 'member-1',
      organisationId: 'org-1',
      role: OrganisationRole.MEMBER,
      user: { name: 'M', surname: 'One', email: 'm@example.com' },
    });
    h.prisma.organisationMember.count.mockResolvedValue(1);
    h.prisma.organisationMember.update.mockResolvedValue({
      userId: 'member-1',
      role: OrganisationRole.OWNER,
      createdAt: new Date('2026-04-04'),
      user: { name: 'M', surname: 'One', email: 'm@example.com' },
    });

    const result = await h.service.changeMemberRole('org-1', 'member-1', {
      role: OrganisationRole.OWNER,
    });

    expect(result.role).toBe(OrganisationRole.OWNER);
  });

  it('lists members with mapped user fields (paginated)', async () => {
    h.prisma.organisationMember.findMany.mockResolvedValue([
      {
        userId: 'u1',
        role: OrganisationRole.OWNER,
        createdAt: new Date('2026-01-01'),
        user: { name: 'Ada', surname: 'Lovelace', email: 'ada@example.com' },
      },
    ]);
    h.prisma.organisationMember.count.mockResolvedValue(1);

    const result = await h.service.findMembers('org-1', { page: 1, limit: 10 });

    expect(h.prisma.organisationMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organisationId: 'org-1' } }),
    );
    expect(result.data[0]).toEqual({
      userId: 'u1',
      name: 'Ada',
      surname: 'Lovelace',
      email: 'ada@example.com',
      role: OrganisationRole.OWNER,
      createdAt: new Date('2026-01-01'),
    });
    expect(result.meta.total).toBe(1);
  });
});
