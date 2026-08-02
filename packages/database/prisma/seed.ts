import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { SEED_ORGANISATIONS, SEED_USER_COUNT } from '../src/seed-data.js';
import { seedSuperAdmin } from '../src/seed-super-admin.js';
import { seedOrganisations } from './seeders/organisation.seeder.js';
import { resetDatabase } from './seeders/reset.seeder.js';
import { seedUsers } from './seeders/user.seeder.js';

// Dev-only super admins so a fresh `pnpm db:seed` always leaves some available
// — two of them, so flows that need a second super admin (one admin acting on
// another) can be exercised locally. Production/staging bootstrap their super
// admin via `pnpm create:superadmin` instead (operator-chosen credentials, no
// repo credentials there).
const DEV_SUPER_ADMINS = [
  {
    email: 'superadmin@example.com',
    password: 'Admin123!',
    name: 'Super',
    surname: 'Admin',
  },
  {
    email: 'superadmin2@example.com',
    password: 'Admin123!',
    name: 'Second',
    surname: 'Admin',
  },
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // `db:seed` is a destructive dev/CI tool: it truncates every table and
  // provisions dev super admins with well-known passwords. Never let it run
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

  // Organisations first: every seeded user is attached to one of them.
  console.log(`Seeding ${SEED_ORGANISATIONS.length} organisations...`);
  await seedOrganisations(prisma);

  console.log(
    `Seeding ${SEED_USER_COUNT} users across ${SEED_ORGANISATIONS.length} organisations...`,
  );
  await seedUsers(prisma);

  console.log(`Seeding ${DEV_SUPER_ADMINS.length} super admins...`);
  for (const superAdmin of DEV_SUPER_ADMINS) {
    await seedSuperAdmin(prisma, superAdmin);
  }

  console.log(
    `Seeding completed. ${SEED_USER_COUNT} users in ${SEED_ORGANISATIONS.length} organisations. ` +
      `Super admins: ${DEV_SUPER_ADMINS.map((admin) => admin.email).join(', ')}`,
  );
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
