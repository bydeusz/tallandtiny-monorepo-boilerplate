import bcrypt from 'bcrypt';
import { PrismaClient } from '../../src/generated/prisma/client.js';

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
}

export async function seedUsers(prisma: PrismaClient): Promise<void> {
  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const users: SeedUser[] = [
    {
      name: 'John',
      surname: 'Doe',
      email: 'john.doe@example.com',
      address: 'Damrak 70',
      postalCode: '1012 LM',
      city: 'Amsterdam',
      country: 'NL',
    },
    {
      name: 'Lisa',
      surname: 'Visser',
      email: 'lisa.visser@example.com',
      address: 'Coolsingel 100',
      postalCode: '3011 AG',
      city: 'Rotterdam',
      country: 'NL',
      kvk: '87654321',
      vatNumber: 'NL987654321B01',
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
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
  }
}
