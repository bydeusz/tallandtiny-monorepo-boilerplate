import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@repo/database';
import { beforeEach, describe, expect, it } from 'vitest';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

class TestController {
  @Roles(Role.SUPER_ADMIN)
  superAdminOnly(): void {}

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  adminArea(): void {}

  unprotected(): void {}
}

function createContext(
  handler: (...args: unknown[]) => unknown,
  user: unknown,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => TestController,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  const controller = new TestController();

  beforeEach(() => {
    guard = new RolesGuard(new Reflector());
  });

  it('allows a handler that declares no roles', () => {
    const context = createContext(controller.unprotected, {
      sub: 'user-1',
      email: 'user@bydeusz.com',
      role: Role.USER,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows a user whose role is one of the required roles', () => {
    const context = createContext(controller.superAdminOnly, {
      sub: 'admin-1',
      email: 'admin@bydeusz.com',
      role: Role.SUPER_ADMIN,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows a user matching any of several required roles', () => {
    const context = createContext(controller.adminArea, {
      sub: 'admin-1',
      email: 'admin@bydeusz.com',
      role: Role.ADMIN,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects a USER on a SUPER_ADMIN-only handler', () => {
    const context = createContext(controller.superAdminOnly, {
      sub: 'user-1',
      email: 'user@bydeusz.com',
      role: Role.USER,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rejects when the request has no authenticated user', () => {
    const context = createContext(controller.superAdminOnly, undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
