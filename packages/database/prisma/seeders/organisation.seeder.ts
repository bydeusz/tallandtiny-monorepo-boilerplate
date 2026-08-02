import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { SEED_ORGANISATIONS } from '../../src/seed-data.js';

export async function seedOrganisations(prisma: PrismaClient): Promise<void> {
  for (const organisation of SEED_ORGANISATIONS) {
    const { id, ...fields } = organisation;

    await prisma.organisation.upsert({
      where: { id },
      update: fields,
      create: organisation,
    });
  }
}
