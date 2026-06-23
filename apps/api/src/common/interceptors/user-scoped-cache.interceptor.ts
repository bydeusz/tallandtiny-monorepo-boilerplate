import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Cache interceptor that namespaces entries by the authenticated
 * user's id. The default `CacheInterceptor` keys only on the request
 * URL, which means a non-member could be served cached data populated
 * by an authorised member (the route handler — and thus
 * `assertMembership` — never runs on a cache hit). Including
 * `req.user.sub` in the key forces each user to populate their own
 * cache entry so authorisation is re-evaluated.
 *
 * Falls back to "anon" when no JWT user is present (public routes).
 */
@Injectable()
export class UserScopedCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    const baseKey = super.trackBy(context);
    if (!baseKey) {
      return undefined;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { sub?: string } }>();
    const userId = request.user?.sub ?? 'anon';

    return `u:${userId}:${baseKey}`;
  }
}
