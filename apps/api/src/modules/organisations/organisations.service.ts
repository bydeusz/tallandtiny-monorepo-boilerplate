import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrganisationRole, Prisma } from '@repo/database';
import { PaginationQueryDto } from '../../common/dto';
import { PaginatedResult } from '../../common/interfaces';
import {
  assertEmailDomainAllowed,
  buildPaginationMeta,
  buildPrismaSkipTake,
  generatePassword,
  hashPassword,
} from '../../common/utils';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage';
import { MAIL_JOB_SEND, QueueService } from '../queue';
import { UsersService } from '../users/users.service';
import {
  AddMemberDto,
  ChangeMemberRoleDto,
  OrganisationMemberResponseDto,
  OrganisationResponseDto,
  UpdateOrganisationDto,
} from './dto';

const organisationSelect = {
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

type OrganisationRow = Prisma.OrganisationGetPayload<{
  select: typeof organisationSelect;
}>;

@Injectable()
export class OrganisationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
    private readonly usersService: UsersService,
  ) {}

  async createOrganisation(
    userId: string,
    dto: Prisma.OrganisationCreateInput,
  ): Promise<OrganisationResponseDto> {
    const organisation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.organisation.create({ data: { ...dto } });
      await tx.organisationMember.create({
        data: {
          userId,
          organisationId: created.id,
          role: OrganisationRole.OWNER,
        },
      });
      return created;
    });

    return this.toOrganisationResponseDto(
      organisation,
      OrganisationRole.OWNER,
      1,
    );
  }

  async findAllForUser(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<OrganisationResponseDto>> {
    const { skip, take } = buildPrismaSkipTake(query);

    const [memberships, total] = await this.prisma.$transaction([
      this.prisma.organisationMember.findMany({
        where: { userId },
        orderBy: { organisation: { createdAt: 'desc' } },
        skip,
        take,
        select: {
          role: true,
          organisation: {
            select: {
              ...organisationSelect,
              _count: { select: { members: true } },
            },
          },
        },
      }),
      this.prisma.organisationMember.count({ where: { userId } }),
    ]);

    const data = await Promise.all(
      memberships.map((m) =>
        this.toOrganisationResponseDto(
          m.organisation,
          m.role,
          m.organisation._count.members,
        ),
      ),
    );

    return { data, meta: buildPaginationMeta(query, total) };
  }

  async findOne(
    organisationId: string,
    role: OrganisationRole,
  ): Promise<OrganisationResponseDto> {
    const organisation = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      select: {
        ...organisationSelect,
        _count: { select: { members: true } },
      },
    });

    if (!organisation) {
      throw new NotFoundException('Organisation not found.');
    }

    return this.toOrganisationResponseDto(
      organisation,
      role,
      organisation._count.members,
    );
  }

  async update(
    organisationId: string,
    dto: UpdateOrganisationDto,
    role: OrganisationRole,
  ): Promise<OrganisationResponseDto> {
    const organisation = await this.prisma.organisation.update({
      where: { id: organisationId },
      data: { ...dto },
      select: {
        ...organisationSelect,
        _count: { select: { members: true } },
      },
    });

    return this.toOrganisationResponseDto(
      organisation,
      role,
      organisation._count.members,
    );
  }

  async findMembers(
    organisationId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<OrganisationMemberResponseDto>> {
    const { skip, take } = buildPrismaSkipTake(query);

    const [members, total] = await this.prisma.$transaction([
      this.prisma.organisationMember.findMany({
        where: { organisationId },
        orderBy: { createdAt: 'asc' },
        skip,
        take,
        select: {
          userId: true,
          role: true,
          createdAt: true,
          user: { select: { name: true, surname: true, email: true } },
        },
      }),
      this.prisma.organisationMember.count({ where: { organisationId } }),
    ]);

    const data = members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      surname: m.user.surname,
      email: m.user.email,
      role: m.role,
      createdAt: m.createdAt,
    }));

    return { data, meta: buildPaginationMeta(query, total) };
  }

  async addMember(
    organisationId: string,
    dto: AddMemberDto,
  ): Promise<OrganisationMemberResponseDto> {
    const existing = await this.usersService.findByEmail(dto.email);

    if (existing) {
      const membership = await this.createMembership(
        organisationId,
        existing.id,
      );
      return {
        userId: existing.id,
        name: existing.name,
        surname: existing.surname,
        email: existing.email,
        role: membership.role,
        createdAt: membership.createdAt,
      };
    }

    if (!dto.name || !dto.surname) {
      throw new BadRequestException(
        'name and surname are required to invite a new account.',
      );
    }

    const allowedDomains =
      this.configService.get<string[]>('auth.allowedEmailDomains') ?? [];
    assertEmailDomainAllowed(dto.email, allowedDomains);

    const temporaryPassword = generatePassword(16);
    const hashedPassword = await hashPassword(temporaryPassword);
    const ttlMs = this.configService.get<number>(
      'auth.invitePasswordTtlMs',
      72 * 60 * 60 * 1000,
    );
    const temporaryPasswordExpiresAt = new Date(Date.now() + ttlMs);
    const { name, surname, email } = dto;

    const { user, membership } = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name,
          surname,
          email,
          password: hashedPassword,
          isActive: true,
          mustChangePassword: true,
          temporaryPasswordExpiresAt,
        },
      });
      const createdMembership = await tx.organisationMember.create({
        data: {
          userId: createdUser.id,
          organisationId,
          role: OrganisationRole.MEMBER,
        },
      });
      return { user: createdUser, membership: createdMembership };
    });

    const organisation = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { name: true },
    });

    await this.sendInvitationEmail(
      user.email,
      `${user.name} ${user.surname}`.trim(),
      temporaryPassword,
      organisation?.name ?? 'the organisation',
    );

    return {
      userId: user.id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      role: membership.role,
      createdAt: membership.createdAt,
    };
  }

  async removeMember(
    organisationId: string,
    targetUserId: string,
  ): Promise<void> {
    await this.assertNotLastOwner(organisationId, targetUserId);

    await this.prisma.organisationMember.delete({
      where: {
        userId_organisationId: { userId: targetUserId, organisationId },
      },
    });
  }

  async changeMemberRole(
    organisationId: string,
    targetUserId: string,
    dto: ChangeMemberRoleDto,
  ): Promise<OrganisationMemberResponseDto> {
    if (dto.role === OrganisationRole.MEMBER) {
      await this.assertNotLastOwner(organisationId, targetUserId);
    } else {
      // promotion: still ensure the member exists
      await this.getMemberOrThrow(organisationId, targetUserId);
    }

    const updated = await this.prisma.organisationMember.update({
      where: {
        userId_organisationId: { userId: targetUserId, organisationId },
      },
      data: { role: dto.role },
      select: {
        userId: true,
        role: true,
        createdAt: true,
        user: { select: { name: true, surname: true, email: true } },
      },
    });

    return {
      userId: updated.userId,
      name: updated.user.name,
      surname: updated.user.surname,
      email: updated.user.email,
      role: updated.role,
      createdAt: updated.createdAt,
    };
  }

  private async getMemberOrThrow(
    organisationId: string,
    targetUserId: string,
  ) {
    const member = await this.prisma.organisationMember.findUnique({
      where: {
        userId_organisationId: { userId: targetUserId, organisationId },
      },
    });
    if (!member) {
      throw new NotFoundException('Member not found.');
    }
    return member;
  }

  private async assertNotLastOwner(
    organisationId: string,
    targetUserId: string,
  ): Promise<void> {
    const target = await this.getMemberOrThrow(organisationId, targetUserId);

    if (target.role !== OrganisationRole.OWNER) {
      return;
    }

    const ownerCount = await this.prisma.organisationMember.count({
      where: { organisationId, role: OrganisationRole.OWNER },
    });

    if (ownerCount <= 1) {
      throw new ConflictException(
        'Cannot remove or demote the last owner of an organisation.',
      );
    }
  }

  private async createMembership(organisationId: string, userId: string) {
    try {
      return await this.prisma.organisationMember.create({
        data: { userId, organisationId, role: OrganisationRole.MEMBER },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('User is already a member.');
      }
      throw error;
    }
  }

  private async sendInvitationEmail(
    email: string,
    name: string,
    temporaryPassword: string,
    organisationName: string,
  ): Promise<void> {
    const resetUrl = this.buildResetPasswordUrl(email);
    await this.queueService.addMailJob(MAIL_JOB_SEND, {
      to: email,
      subject: `You've been invited to ${organisationName}`,
      template: 'organisation-invitation',
      context: { name, organisationName, temporaryPassword, resetUrl },
    });
  }

  private buildResetPasswordUrl(email: string): string {
    const frontendUrl = this.configService.get<string>(
      'auth.frontendUrl',
      'http://localhost:3000',
    );
    const url = new URL('/reset-password/confirm', frontendUrl);
    url.searchParams.set('email', email);
    return url.toString();
  }

  private async toOrganisationResponseDto(
    organisation: OrganisationRow,
    role: OrganisationRole,
    memberCount: number,
  ): Promise<OrganisationResponseDto> {
    const logoUrl = await this.resolveAssetUrl(organisation.logoUrl);
    return { ...organisation, logoUrl, memberCount, role };
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
