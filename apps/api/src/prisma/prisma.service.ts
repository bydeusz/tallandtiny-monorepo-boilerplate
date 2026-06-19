import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient, prisma } from '@repo/database';

/**
 * Thin injectable wrapper around the shared Prisma singleton from @repo/database.
 *
 * NOTE: Prisma 7's PrismaClientConstructor requires an `options` argument in its
 * `new()` signature (the adapter is mandatory), so `extends PrismaClient` with
 * a bare `super()` call fails to compile. We use the documented fallback: expose
 * the configured singleton via `this.db` so feature services call `this.prisma.db.mini.*`.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly db: PrismaClient = prisma;

  async onModuleInit() {
    await this.db.$connect();
  }

  async onModuleDestroy() {
    await this.db.$disconnect();
  }
}
