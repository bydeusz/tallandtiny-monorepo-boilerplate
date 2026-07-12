import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { seedSuperAdmin } from '../src/seed-super-admin.js';
import { resetDatabase } from './seeders/reset.seeder.js';
import { seedUsers } from './seeders/user.seeder.js';

// Dev-only super admin so a fresh `pnpm db:seed` always leaves one available.
// Production/staging bootstrap the super admin from env vars via
// `pnpm db:seed:super-admin` instead (no repo credentials there).
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
