import { Role } from '@repo/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

vi.mock('../../common/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../common/utils')>();
  return { ...actual, comparePassword: vi.fn().mockResolvedValue(true) };
});

function buildService() {
  const configService = {
    getOrThrow: vi.fn((key: string) => {
      if (key === 'jwt.refreshExpiration') return '7d';
      if (key === 'jwt.refreshSecret') return 'refresh-secret';
      return undefined;
    }),
    get: vi.fn((key: string) => {
      if (key === 'auth.allowedEmailDomains') return ['bydeusz.com'];
      if (key === 'auth.frontendUrl') return 'http://localhost:3000';
      return undefined;
    }),
  };
  const jwtService = { signAsync: vi.fn().mockResolvedValue('access-token') };
  const prisma = {
    user: {
      create: vi.fn().mockResolvedValue({
        id: 'user-1',
        name: 'Ada',
        surname: 'Lovelace',
        email: 'ada@bydeusz.com',
      }),
    },
    activationCode: {
      create: vi.fn().mockResolvedValue({ code: '123456' }),
    },
    refreshToken: {
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  const usersService = { findByEmail: vi.fn().mockResolvedValue(null) };
  const queueService = { addMailJob: vi.fn().mockResolvedValue(undefined) };

  const service = new AuthService(
    configService as never,
    jwtService as never,
    prisma as never,
    usersService as never,
    queueService as never,
  );

  return { service, configService, jwtService, prisma, usersService, queueService };
}

type Harness = ReturnType<typeof buildService>;

describe('AuthService — role in JWT payload', () => {
  let h: Harness;

  beforeEach(() => {
    h = buildService();
  });

  it('includes the role in the signed access-token payload', async () => {
    await h.service.generateTokens({
      id: 'user-1',
      email: 'admin@bydeusz.com',
      role: Role.SUPER_ADMIN,
    });

    expect(h.jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'admin@bydeusz.com',
      role: Role.SUPER_ADMIN,
    });
  });

  it('sets the role from the database record on login', async () => {
    h.usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'admin@bydeusz.com',
      password: 'hashed',
      isActive: true,
      mustChangePassword: false,
      role: Role.SUPER_ADMIN,
    });
    const generateSpy = vi
      .spyOn(h.service, 'generateTokens')
      .mockResolvedValue({ access_token: 'a', refresh_token: 'r' });

    await h.service.login({ email: 'admin@bydeusz.com', password: 'pw' });

    expect(generateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ role: Role.SUPER_ADMIN }),
    );
  });

  it('sets the role from the database record on refresh', async () => {
    vi.spyOn(
      h.service as unknown as {
        getValidRefreshTokenRecord: (t: string) => Promise<unknown>;
      },
      'getValidRefreshTokenRecord',
    ).mockResolvedValue({
      id: 'rt-1',
      user: {
        id: 'user-1',
        email: 'admin@bydeusz.com',
        role: Role.SUPER_ADMIN,
      },
    });
    const generateSpy = vi
      .spyOn(h.service, 'generateTokens')
      .mockResolvedValue({ access_token: 'a', refresh_token: 'r' });

    await h.service.refreshTokens('some.refresh.token');

    expect(generateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ role: Role.SUPER_ADMIN }),
    );
  });
});

describe('AuthService — registration cannot escalate role', () => {
  let h: Harness;

  beforeEach(() => {
    h = buildService();
  });

  it('never passes a role to user creation (defaults to USER)', async () => {
    await h.service.register({
      name: 'Ada',
      surname: 'Lovelace',
      email: 'ada@bydeusz.com',
      password: 'password123',
    });

    expect(h.prisma.user.create).toHaveBeenCalledTimes(1);
    const createArg = h.prisma.user.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(createArg.data).not.toHaveProperty('role');
  });
});
