import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { OrganisationRole } from '@repo/database';
import { describe, expect, it, vi } from 'vitest';
import { OrganisationMemberGuard } from './organisation-member.guard';

function createContext(user: unknown, params: Record<string, string>) {
  const request: Record<string, unknown> = { user, params };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { ctx, request };
}

function buildGuard(membership: unknown) {
  const prisma = {
    organisationMember: { findUnique: vi.fn().mockResolvedValue(membership) },
  };
  return {
    guard: new OrganisationMemberGuard(prisma as never),
    prisma,
  };
}

describe('OrganisationMemberGuard', () => {
  const user = { sub: 'user-1', email: 'a@example.com', role: 'USER' };

  it('allows a member and attaches the membership to the request', async () => {
    const membership = {
      id: 'm1',
      userId: 'user-1',
      organisationId: 'org-1',
      role: OrganisationRole.MEMBER,
    };
    const { guard } = buildGuard(membership);
    const { ctx, request } = createContext(user, { id: 'org-1' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.organisationMembership).toEqual(membership);
  });

  it('throws 404 when the caller is not a member', async () => {
    const { guard } = buildGuard(null);
    const { ctx } = createContext(user, { id: 'org-1' });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws 404 when there is no org id param', async () => {
    const { guard } = buildGuard(null);
    const { ctx } = createContext(user, {});

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
