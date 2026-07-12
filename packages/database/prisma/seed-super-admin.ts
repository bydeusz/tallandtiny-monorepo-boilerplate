import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { seedSuperAdmin } from '../src/seed-super-admin.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const email = process.env.SUPER_ADMIN_EMAIL;
const password = process.env.SUPER_ADMIN_PASSWORD;
if (!email || !password) {
  throw new Error(
    'SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set to seed a super admin.',
  );
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const admin = await seedSuperAdmin(prisma, { email, password });
  console.log(`Super admin ready: ${admin.email} (${admin.role})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error: unknown) => {
    console.error('Super admin seed failed:', error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
