import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganisationRole } from '@repo/database';
import { PrismaService } from '../../../prisma/prisma.service';
import { RequestWithMembership } from './organisation-member.guard';

@Injectable()
export class OrganisationOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithMembership>();
    const userId = request.user?.sub;
    const organisationId = request.params?.id as string | undefined;

    if (!userId || !organisationId) {
      throw new NotFoundException('Organisation not found.');
    }

    const membership = await this.prisma.organisationMember.findUnique({
      where: { userId_organisationId: { userId, organisationId } },
    });

    if (!membership) {
      throw new NotFoundException('Organisation not found.');
    }

    if (membership.role !== OrganisationRole.OWNER) {
      throw new ForbiddenException('Only organisation owners can do this.');
    }

    request.organisationMembership = membership;
    return true;
  }
}
