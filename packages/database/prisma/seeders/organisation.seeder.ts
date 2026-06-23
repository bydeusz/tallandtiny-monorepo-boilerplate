import { PrismaClient } from '../../src/generated/prisma/client.js';

export interface SeededOrganisationIds {
  nike: string;
}

const organisations: Array<{
  id: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  kvk?: string;
  vatNumber?: string;
  iban?: string;
}> = [
  {
    id: '95ea1d7c-9552-4ea8-9d17-bf305f1246b7',
    name: 'NIKE BV',
    address: 'Zuiderpark 1',
    postalCode: '2011 EJ',
    city: 'Amsterdam',
    kvk: '12345678',
    vatNumber: 'NL123456789B01',
    iban: 'NL91ABNA0417164300',
  },
];

export async function seedOrganisations(
  prisma: PrismaClient,
): Promise<SeededOrganisationIds> {
  for (const organisation of organisations) {
    await prisma.organisation.upsert({
      where: { id: organisation.id },
      update: { ...organisation },
      create: { ...organisation },
    });
  }

  return { nike: organisations[0]!.id };
}
