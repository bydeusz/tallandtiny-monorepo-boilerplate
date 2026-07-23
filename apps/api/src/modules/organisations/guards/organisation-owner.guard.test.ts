import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrganisationRole } from '@repo/database';
import { describe, expect, it, vi } from 'vitest';
import { OrganisationOwnerGuard } from './organisation-owner.guard';

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
  return new OrganisationOwnerGuard(prisma as never);
}

const user = { sub: 'user-1', email: 'a@example.com', role: 'USER' };

describe('OrganisationOwnerGuard', () => {
  it('allows an OWNER and attaches the membership', async () => {
    const membership = {
      id: 'm1',
      userId: 'user-1',
      organisationId: 'org-1',
      role: OrganisationRole.OWNER,
    };
    const guard = buildGuard(membership);
    const { ctx, request } = createContext(user, { id: 'org-1' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.organisationMembership).toEqual(membership);
  });

  it('throws 403 for a MEMBER (not an owner)', async () => {
    const guard = buildGuard({
      id: 'm1',
      userId: 'user-1',
      organisationId: 'org-1',
      role: OrganisationRole.MEMBER,
    });
    const { ctx } = createContext(user, { id: 'org-1' });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws 404 for a non-member', async () => {
    const guard = buildGuard(null);
    const { ctx } = createContext(user, { id: 'org-1' });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
