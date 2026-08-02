import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { SEED_ORGANISATIONS } from '../../src/seed-data.js';

/**
 * Create the 10 dev organisations.
 *
 * Upserted on their fixed seed ids (Organisation has no unique business key),
 * so running this twice updates the same ten rows instead of piling up
 * duplicates. Must run before `seedUsers`, which attaches every user to one
 * of these organisations.
 */
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
