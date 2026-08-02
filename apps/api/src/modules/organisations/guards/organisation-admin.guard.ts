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

/**
 * Restricts a route to admins of the organisation in `:id`.
 *
 * Organisations have exactly two roles: ADMIN, who can change anything about
 * the organisation, and MEMBER, who cannot. A non-member gets 404 rather than
 * 403 so the guard never confirms that an organisation exists to someone with
 * no business knowing.
 */
@Injectable()
export class OrganisationAdminGuard implements CanActivate {
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

    if (membership.role !== OrganisationRole.ADMIN) {
      throw new ForbiddenException('Only organisation admins can do this.');
    }

    request.organisationMembership = membership;
    return true;
  }
}
