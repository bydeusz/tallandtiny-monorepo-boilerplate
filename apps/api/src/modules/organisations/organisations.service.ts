import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import { PaginationQueryDto } from '../../common/dto';
import { PaginatedResult } from '../../common/interfaces';
import {
  assertEmailDomainAllowed,
  buildPaginationMeta,
  buildPrismaSkipTake,
  generatePassword,
  hashPassword,
} from '../../common/utils';
import { OrganisationRole, Prisma } from '@repo/database';
import { PrismaService } from '../../prisma/prisma.service';
import { MAIL_JOB_SEND, QueueService } from '../queue';
import { StorageService } from '../storage';
import { OrganisationAccessService } from './organisation-access.service';
import {
  CreateOrganisationDto,
  InviteMemberDto,
  OrganisationMemberResponseDto,
  OrganisationResponseDto,
  UpdateMemberRoleDto,
  UpdateOrganisationDto,
} from './dto';

const organisationPublicSelect = {
  id: true,
  name: true,
  address: true,
  postalCode: true,
  city: true,
  kvk: true,
  vatNumber: true,
  iban: true,
  logoUrl: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OrganisationSelect;
type OrganisationPublic = Prisma.OrganisationGetPayload<{
  select: typeof organisationPublicSelect;
}>;

const memberUserSelect = {
  id: true,
  name: true,
  surname: true,
  email: true,
  isActive: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const memberSelect = {
  id: true,
  userId: true,
  organisationId: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  user: { select: memberUserSelect },
} satisfies Prisma.OrganisationMemberSelect;
type MemberWithUser = Prisma.OrganisationMemberGetPayload<{
  select: typeof memberSelect;
}>;

@Injectable()
export class OrganisationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly organisationAccess: OrganisationAccessService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private async invalidateCache(): Promise<void> {
    await this.cacheManager.clear();
  }

  async create(
    createOrganisationDto: CreateOrganisationDto,
    userId: string,
  ): Promise<OrganisationResponseDto> {
    const organisation = await this.prisma.organisation.create({
      data: {
        ...createOrganisationDto,
        members: {
          create: {
            userId,
            role: OrganisationRole.OWNER,
          },
        },
      },
      select: organisationPublicSelect,
    });

    await this.invalidateCache();

    return this.toOrganisationResponseDto(organisation);
  }

  async findAll(
    query: PaginationQueryDto,
    userId: string,
  ): Promise<PaginatedResult<OrganisationResponseDto>> {
    const { skip, take } = buildPrismaSkipTake(query);

    const where: Prisma.OrganisationWhereInput = {
      members: { some: { userId } },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.organisation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: organisationPublicSelect,
        skip,
        take,
      }),
      this.prisma.organisation.count({ where }),
    ]);

    const data = await Promise.all(
      items.map((item) => this.toOrganisationResponseDto(item)),
    );

    return {
      data,
      meta: buildPaginationMeta(query, total),
    };
  }

  async findOne(id: string, userId: string): Promise<OrganisationResponseDto> {
    await this.organisationAccess.assertMembership(id, userId);

    const organisation = await this.prisma.organisation.findUnique({
      where: { id },
      select: organisationPublicSelect,
    });

    if (!organisation) {
      throw new NotFoundException('Organisation not found.');
    }

    return this.toOrganisationResponseDto(organisation);
  }

  async update(
    id: string,
    updateOrganisationDto: UpdateOrganisationDto,
    userId: string,
  ): Promise<OrganisationResponseDto> {
    await this.organisationAccess.assertOwnership(id, userId);

    const organisation = await this.prisma.organisation.update({
      where: { id },
      data: updateOrganisationDto,
      select: organisationPublicSelect,
    });

    await this.invalidateCache();

    return this.toOrganisationResponseDto(organisation);
  }

  async remove(id: string, userId: string): Promise<OrganisationResponseDto> {
    await this.organisationAccess.assertOwnership(id, userId);

    const organisation = await this.prisma.organisation.delete({
      where: { id },
      select: organisationPublicSelect,
    });

    await this.invalidateCache();

    return this.toOrganisationResponseDto(organisation);
  }

  async listMembers(
    organisationId: string,
    query: PaginationQueryDto,
    actorId: string,
  ): Promise<PaginatedResult<OrganisationMemberResponseDto>> {
    await this.organisationAccess.assertMembership(organisationId, actorId);

    const { skip, take } = buildPrismaSkipTake(query);
    const where: Prisma.OrganisationMemberWhereInput = { organisationId };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.organisationMember.findMany({
        where,
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        select: memberSelect,
        skip,
        take,
      }),
      this.prisma.organisationMember.count({ where }),
    ]);

    const data = await Promise.all(
      items.map((item) => this.toMemberResponseDto(item)),
    );

    return {
      data,
      meta: buildPaginationMeta(query, total),
    };
  }

  async inviteMember(
    organisationId: string,
    dto: InviteMemberDto,
    actorId: string,
  ): Promise<OrganisationMemberResponseDto> {
    await this.organisationAccess.assertOwnership(organisationId, actorId);

    const email = dto.email.trim().toLowerCase();
    const role = dto.role ?? OrganisationRole.MEMBER;

    type InviteOutcome = {
      member: MemberWithUser;
      newUserCredentials: { name: string; password: string } | null;
    };

    let outcome: InviteOutcome;
    try {
      outcome = await this.prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({
          where: { email },
          select: { id: true },
        });

        let userId: string;
        let newUserCredentials: InviteOutcome['newUserCredentials'] = null;

        if (existingUser) {
          userId = existingUser.id;
        } else {
          const name = dto.name?.trim();
          const surname = dto.surname?.trim();
          if (!name || !surname) {
            throw new BadRequestException(
              'Name and surname are required for new users.',
            );
          }
          this.validateEmailDomain(email);

          const tempPassword = generatePassword(16);
          const hashedPassword = await hashPassword(tempPassword);

          const created = await tx.user.create({
            data: {
              name,
              surname,
              email,
              password: hashedPassword,
              isActive: true,
              mustChangePassword: true,
              temporaryPasswordExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
            },
            select: { id: true, name: true, surname: true },
          });
          userId = created.id;
          newUserCredentials = {
            name: `${created.name} ${created.surname}`.trim(),
            password: tempPassword,
          };
        }

        let member: MemberWithUser;
        try {
          member = await tx.organisationMember.create({
            data: { userId, organisationId, role },
            select: memberSelect,
          });
        } catch (err) {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
          ) {
            throw new ConflictException('User is already a member.');
          }
          throw err;
        }

        return { member, newUserCredentials };
      });
    } catch (err) {
      // P2002 escaping the tx = concurrent invite created the same email first.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('A user with this email already exists.');
      }
      throw err;
    }

    if (outcome.newUserCredentials) {
      await this.queueService.addMailJob(MAIL_JOB_SEND, {
        to: email,
        subject: 'Your account has been created',
        template: 'new-user-credentials',
        context: {
          name: outcome.newUserCredentials.name,
          password: outcome.newUserCredentials.password,
        },
      });
    }

    await this.invalidateCache();

    return this.toMemberResponseDto(outcome.member);
  }

  async updateMemberRole(
    organisationId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
    actorId: string,
  ): Promise<OrganisationMemberResponseDto> {
    await this.organisationAccess.assertOwnership(organisationId, actorId);

    const updated = await this.withSerializableRetry(async (tx) => {
      const membership = await tx.organisationMember.findUnique({
        where: {
          userId_organisationId: { userId: targetUserId, organisationId },
        },
        select: memberSelect,
      });
      if (!membership) {
        throw new NotFoundException('Member not found.');
      }

      if (membership.role === dto.role) {
        return membership;
      }

      if (
        membership.role === OrganisationRole.OWNER &&
        dto.role === OrganisationRole.MEMBER
      ) {
        await this.assertNotLastOwner(
          tx,
          organisationId,
          'Cannot demote the last owner.',
        );
      }

      return tx.organisationMember.update({
        where: {
          userId_organisationId: { userId: targetUserId, organisationId },
        },
        data: { role: dto.role },
        select: memberSelect,
      });
    });

    await this.invalidateCache();

    return this.toMemberResponseDto(updated);
  }

  async removeMember(
    organisationId: string,
    targetUserId: string,
    actorId: string,
  ): Promise<OrganisationMemberResponseDto> {
    if (targetUserId !== actorId) {
      await this.organisationAccess.assertOwnership(organisationId, actorId);
    } else {
      await this.organisationAccess.assertMembership(organisationId, actorId);
    }

    const removed = await this.withSerializableRetry(async (tx) => {
      const membership = await tx.organisationMember.findUnique({
        where: {
          userId_organisationId: { userId: targetUserId, organisationId },
        },
        select: { role: true },
      });
      if (!membership) {
        throw new NotFoundException('Member not found.');
      }

      if (membership.role === OrganisationRole.OWNER) {
        await this.assertNotLastOwner(
          tx,
          organisationId,
          'Cannot remove the last owner.',
        );
      }

      return tx.organisationMember.delete({
        where: {
          userId_organisationId: { userId: targetUserId, organisationId },
        },
        select: memberSelect,
      });
    });

    await this.invalidateCache();

    return this.toMemberResponseDto(removed);
  }

  private async assertNotLastOwner(
    tx: Prisma.TransactionClient,
    organisationId: string,
    message: string,
  ): Promise<void> {
    const ownerCount = await tx.organisationMember.count({
      where: { organisationId, role: OrganisationRole.OWNER },
    });
    if (ownerCount <= 1) {
      throw new BadRequestException(message);
    }
  }

  /**
   * Runs `callback` inside a SERIALIZABLE transaction and retries on
   * Postgres serialization failures (Prisma error P2034). Use for
   * read-then-write flows where the read predicate must hold at commit
   * time (e.g. last-owner protection).
   */
  private async withSerializableRetry<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
    maxAttempts = 3,
  ): Promise<T> {
    let attempt = 0;
    while (true) {
      attempt += 1;
      try {
        return await this.prisma.$transaction(callback, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (err) {
        const isRetriable =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2034';
        if (!isRetriable || attempt >= maxAttempts) {
          throw err;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, 25 * attempt + Math.random() * 25),
        );
      }
    }
  }

  private validateEmailDomain(email: string): void {
    const allowedDomains =
      this.configService.get<string[]>('auth.allowedEmailDomains') ?? [];
    assertEmailDomainAllowed(email, allowedDomains);
  }

  private async toOrganisationResponseDto(
    organisation: OrganisationPublic,
  ): Promise<OrganisationResponseDto> {
    const logoUrl = await this.resolveAssetUrl(organisation.logoUrl);

    return {
      ...organisation,
      logoUrl,
    };
  }

  private async toMemberResponseDto(
    member: MemberWithUser,
  ): Promise<OrganisationMemberResponseDto> {
    const avatarUrl = await this.resolveAssetUrl(member.user.avatarUrl);

    return {
      id: member.id,
      userId: member.userId,
      organisationId: member.organisationId,
      role: member.role,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      user: {
        ...member.user,
        avatarUrl,
      },
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
