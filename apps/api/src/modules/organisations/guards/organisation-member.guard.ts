import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganisationMember } from '@repo/database';
import { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';

export type RequestWithMembership = Request & {
  user?: { sub?: string };
  organisationMembership?: OrganisationMember;
};

@Injectable()
export class OrganisationMemberGuard implements CanActivate {
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

    request.organisationMembership = membership;
    return true;
  }
}
