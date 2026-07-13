import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { Prisma, User } from '@repo/database';
import { PaginationQueryDto } from '../../common/dto';
import { PaginatedResult } from '../../common/interfaces';
import { buildPaginationMeta, buildPrismaSkipTake } from '../../common/utils';
import { StorageService } from '../storage';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CurrentUserResponseDto,
  UpdateUserDto,
  UserResponseDto,
} from './dto';

const userPublicSelect = {
  id: true,
  name: true,
  surname: true,
  email: true,
  isActive: true,
  avatarUrl: true,
  address: true,
  postalCode: true,
  city: true,
  country: true,
  kvk: true,
  vatNumber: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;
type UserPublic = Prisma.UserGetPayload<{ select: typeof userPublicSelect }>;

// The platform role is only exposed for the *current* user (via /auth/me), not
// through the shared user list/detail endpoints — those stay gated to the super
// admin in a later story, and must not leak who the super admins are.
const currentUserSelect = {
  ...userPublicSelect,
  role: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private async invalidateCache(): Promise<void> {
    await this.cacheManager.clear();
  }

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<UserResponseDto>> {
    const { skip, take } = buildPrismaSkipTake(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: userPublicSelect,
        skip,
        take,
      }),
      this.prisma.user.count(),
    ]);

    const data = await Promise.all(
      items.map((item) => this.toUserResponseDto(item)),
    );

    return {
      data,
      meta: buildPaginationMeta(query, total),
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.toUserResponseDto(user);
  }

  async findCurrentUser(id: string): Promise<CurrentUserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: currentUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const avatarUrl = await this.resolveAssetUrl(user.avatarUrl);
    return { ...user, avatarUrl };
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async updatePassword(
    userId: string,
    hashedPassword: string,
    mustChangePassword = false,
    temporaryPasswordExpiresAt: Date | null = null,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword,
        temporaryPasswordExpiresAt,
      },
    });

    await this.invalidateCache();
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    await this.findOne(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
      },
      select: userPublicSelect,
    });

    await this.invalidateCache();

    return this.toUserResponseDto(user);
  }

  async remove(id: string): Promise<UserResponseDto> {
    await this.findOne(id);

    const user = await this.prisma.user.delete({
      where: { id },
      select: userPublicSelect,
    });

    await this.invalidateCache();

    return this.toUserResponseDto(user);
  }

  private async toUserResponseDto(user: UserPublic): Promise<UserResponseDto> {
    const avatarUrl = await this.resolveAssetUrl(user.avatarUrl);

    return {
      ...user,
      avatarUrl,
    };
  }

  private async resolveAssetUrl(
    assetRef: string | null,
  ): Promise<string | null> {
    if (!assetRef) {
      return null;
    }

    const key = this.storageService.extractKeyFromUrl(assetRef);

    try {
      return await this.storageService.getSignedUrl(key);
    } catch {
      return null;
    }
  }
}
