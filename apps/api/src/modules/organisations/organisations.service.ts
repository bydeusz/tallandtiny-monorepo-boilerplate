import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrganisationRole, Prisma } from '@repo/database';
import { PaginationQueryDto } from '../../common/dto';
import { PaginatedResult } from '../../common/interfaces';
import { buildPaginationMeta, buildPrismaSkipTake } from '../../common/utils';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage';
import { QueueService } from '../queue';
import { UsersService } from '../users/users.service';
import { OrganisationResponseDto } from './dto';

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
