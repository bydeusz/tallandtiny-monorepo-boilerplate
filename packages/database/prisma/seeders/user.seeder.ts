import bcrypt from 'bcrypt';
import {
  OrganisationRole,
  PrismaClient,
} from '../../src/generated/prisma/client.js';
import type { SeededOrganisationIds } from './organisation.seeder.js';

interface SeedUser {
  name: string;
  surname: string;
  email: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  kvk?: string;
  vatNumber?: string;
  organisations: Array<{ organisationId: string; role: OrganisationRole }>;
}

export async function seedUsers(
  prisma: PrismaClient,
  organisationIds: SeededOrganisationIds,
): Promise<void> {
  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const users: SeedUser[] = [
    {
      name: 'John',
      surname: 'Doe',
      email: 'john.doe@bydeusz.com',
      address: 'Damrak 70',
      postalCode: '1012 LM',
      city: 'Amsterdam',
      country: 'NL',
      organisations: [
        { organisationId: organisationIds.nike, role: OrganisationRole.MEMBER },
      ],
    },
    {
      name: 'Lisa',
      surname: 'Visser',
      email: 'lisa.visser@bydeusz.com',
      address: 'Coolsingel 100',
      postalCode: '3011 AG',
      city: 'Rotterdam',
      country: 'NL',
      kvk: '87654321',
      vatNumber: 'NL987654321B01',
      organisations: [
        { organisationId: organisationIds.nike, role: OrganisationRole.OWNER },
      ],
    },
  ];

  for (const user of users) {
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        surname: user.surname,
        password: passwordHash,
        isActive: true,
        address: user.address ?? null,
        postalCode: user.postalCode ?? null,
        city: user.city ?? null,
        country: user.country ?? null,
        kvk: user.kvk ?? null,
        vatNumber: user.vatNumber ?? null,
      },
      create: {
        name: user.name,
        surname: user.surname,
        email: user.email,
        password: passwordHash,
        isActive: true,
        address: user.address,
        postalCode: user.postalCode,
        city: user.city,
        country: user.country,
        kvk: user.kvk,
        vatNumber: user.vatNumber,
      },
    });

    for (const membership of user.organisations) {
      await prisma.organisationMember.upsert({
        where: {
          userId_organisationId: {
            userId: created.id,
            organisationId: membership.organisationId,
          },
        },
        update: { role: membership.role },
        create: {
          userId: created.id,
          organisationId: membership.organisationId,
          role: membership.role,
        },
      });
    }
  }
}
