import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { seedSuperAdmin } from '../src/seed-super-admin.js';
import { resetDatabase } from './seeders/reset.seeder.js';
import { seedUsers } from './seeders/user.seeder.js';

// Dev-only super admin so a fresh `pnpm db:seed` always leaves one available.
// Production/staging bootstrap the super admin via `pnpm create:superadmin`
// instead (operator-chosen credentials, no repo credentials there).
const DEV_SUPER_ADMIN = {
  email: 'superadmin@bydeusz.com',
  password: 'Admin123!',
  name: 'Super',
  surname: 'Admin',
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // `db:seed` is a destructive dev/CI tool: it truncates every table and
  // provisions a dev super admin with a well-known password. Never let it run
  // against a production database — bootstrap prod admins with
  // `pnpm create:superadmin` instead.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Refusing to run db:seed with NODE_ENV=production. This command is for ' +
        'local/CI only; use `pnpm create:superadmin` to bootstrap a production admin.',
    );
  }

  console.log('Clearing database...');
  await resetDatabase(prisma);
  console.log('Seeding database...');
  await seedUsers(prisma);
  await seedSuperAdmin(prisma, DEV_SUPER_ADMIN);
  console.log(`Seeding completed. Super admin: ${DEV_SUPER_ADMIN.email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error: unknown) => {
    console.error('Seeding failed:', error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
