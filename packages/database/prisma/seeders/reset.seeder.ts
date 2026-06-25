import { PrismaClient } from '../../src/generated/prisma/client.js';

/**
 * Empties every table in the public schema before seeding.
 *
 * Table names are discovered dynamically so this keeps working as models are
 * added or removed. The Prisma migrations table is excluded so Prisma still
 * considers the schema up to date. CASCADE handles foreign-key order and
 * RESTART IDENTITY resets sequences.
 */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename != '_prisma_migrations'
  `;

  if (tables.length === 0) {
    return;
  }

  const tableNames = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`,
  );
}
