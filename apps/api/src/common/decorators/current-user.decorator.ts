import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: unknown }>();
    const { user } = request;

    if (!data) {
      return user;
    }

    if (!user || typeof user !== 'object') {
      return undefined;
    }

    return (user as Record<string, unknown>)[data];
  },
);
