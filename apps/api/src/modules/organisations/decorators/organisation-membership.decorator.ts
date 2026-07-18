import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OrganisationMember } from '@repo/database';

export const OrganisationMembership = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): OrganisationMember | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ organisationMembership?: OrganisationMember }>();
    return request.organisationMembership;
  },
);
