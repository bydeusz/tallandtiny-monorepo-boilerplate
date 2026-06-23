import { ForbiddenException, Injectable } from '@nestjs/common';
import { OrganisationRole } from '@repo/database';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrganisationAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertMembership(
    organisationId: string,
    userId: string,
  ): Promise<OrganisationRole> {
    const membership = await this.prisma.organisationMember.findUnique({
      where: { userId_organisationId: { userId, organisationId } },
      select: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You do not have access to this organisation.',
      );
    }

    return membership.role;
  }

  async assertOwnership(organisationId: string, userId: string): Promise<void> {
    const role = await this.assertMembership(organisationId, userId);

    if (role !== OrganisationRole.OWNER) {
      throw new ForbiddenException(
        'Only organisation owners can perform this action.',
      );
    }
  }

  async getMembership(organisationId: string, userId: string) {
    return this.prisma.organisationMember.findUnique({
      where: { userId_organisationId: { userId, organisationId } },
      select: { role: true },
    });
  }

  async sharesOrganisationWith(
    currentUserId: string,
    targetUserId: string,
  ): Promise<boolean> {
    const shared = await this.prisma.organisationMember.findFirst({
      where: {
        userId: currentUserId,
        organisation: {
          members: {
            some: { userId: targetUserId },
          },
        },
      },
      select: { id: true },
    });

    return shared !== null;
  }

  async listOrganisationIdsForUser(userId: string): Promise<string[]> {
    const memberships = await this.prisma.organisationMember.findMany({
      where: { userId },
      select: { organisationId: true },
    });

    return memberships.map((m) => m.organisationId);
  }
}
