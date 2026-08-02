import type { OrganisationRole } from './generated/prisma/client.js';

export interface SeedOrganisation {
  id: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  kvk: string;
  vatNumber: string;
  iban: string;
}

export interface SeedUser {
  name: string;
  surname: string;
  email: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  kvk?: string;
  vatNumber?: string;
  organisationId: string;
  organisationRole: OrganisationRole;
}

export const SEED_USER_COUNT = 350;

export const ADMINS_PER_ORGANISATION = 4;

export const SEED_PASSWORD = 'Admin123!';

export const SEED_ORGANISATIONS: SeedOrganisation[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Bakkerij Van Dijk',
    address: 'Damrak 12',
    postalCode: '1012 LG',
    city: 'Amsterdam',
    kvk: '10000001',
    vatNumber: 'NL100000010B01',
    iban: 'NL91ABNA0417164301',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Rotterdam Logistics',
    address: 'Coolsingel 88',
    postalCode: '3011 AD',
    city: 'Rotterdam',
    kvk: '10000002',
    vatNumber: 'NL100000020B01',
    iban: 'NL91ABNA0417164302',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    name: 'Groene Energie Nederland',
    address: 'Lange Voorhout 44',
    postalCode: '2514 EE',
    city: 'Den Haag',
    kvk: '10000003',
    vatNumber: 'NL100000030B01',
    iban: 'NL91ABNA0417164303',
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    name: 'Studio Noord',
    address: 'Oudegracht 210',
    postalCode: '3511 NP',
    city: 'Utrecht',
    kvk: '10000004',
    vatNumber: 'NL100000040B01',
    iban: 'NL91ABNA0417164304',
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    name: 'TechVeld Solutions',
    address: 'Vestdijk 25',
    postalCode: '5611 CA',
    city: 'Eindhoven',
    kvk: '10000005',
    vatNumber: 'NL100000050B01',
    iban: 'NL91ABNA0417164305',
  },
  {
    id: '00000000-0000-4000-8000-000000000006',
    name: 'Zorggroep De Linde',
    address: 'Grote Markt 12',
    postalCode: '9711 LV',
    city: 'Groningen',
    kvk: '10000006',
    vatNumber: 'NL100000060B01',
    iban: 'NL91ABNA0417164306',
  },
  {
    id: '00000000-0000-4000-8000-000000000007',
    name: 'Bouwbedrijf Jansen',
    address: 'Keizersgracht 15',
    postalCode: '8011 XA',
    city: 'Zwolle',
    kvk: '10000007',
    vatNumber: 'NL100000070B01',
    iban: 'NL91ABNA0417164307',
  },
  {
    id: '00000000-0000-4000-8000-000000000008',
    name: 'Amsterdam Media Collectief',
    address: 'Markt 30',
    postalCode: '4811 XZ',
    city: 'Breda',
    kvk: '10000008',
    vatNumber: 'NL100000080B01',
    iban: 'NL91ABNA0417164308',
  },
  {
    id: '00000000-0000-4000-8000-000000000009',
    name: 'Fietsfabriek Utrecht',
    address: 'Stationsplein 8',
    postalCode: '6512 AB',
    city: 'Nijmegen',
    kvk: '10000009',
    vatNumber: 'NL100000090B01',
    iban: 'NL91ABNA0417164309',
  },
  {
    id: '00000000-0000-4000-8000-000000000010',
    name: 'De Zeeuwse Kwekerij',
    address: 'Wilhelminastraat 3',
    postalCode: '7511 CZ',
    city: 'Enschede',
    kvk: '10000010',
    vatNumber: 'NL100000100B01',
    iban: 'NL91ABNA0417164310',
  },
];

const NAMED_USERS: Array<Omit<SeedUser, 'organisationId' | 'organisationRole'>> =
  [
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

const FIRST_NAMES = [
  'Daan',
  'Sanne',
  'Bram',
  'Femke',
  'Jeroen',
  'Marieke',
  'Tim',
  'Anouk',
  'Rick',
  'Esther',
  'Joost',
  'Sofie',
  'Niels',
  'Merel',
  'Ruben',
  'Iris',
  'Wouter',
  'Lotte',
  'Sven',
  'Maud',
  'Thijs',
  'Nienke',
  'Bas',
  'Eline',
  'Koen',
];

const LAST_NAMES = [
  'Jansen',
  'De Vries',
  'Van den Berg',
  'Bakker',
  'Meijer',
  'Smit',
  'Mulder',
  'De Boer',
  'Bos',
  'Vos',
  'Peters',
  'Hendriks',
  'Dekker',
  'Brouwer',
  'Kuipers',
  'Willems',
  'Van Leeuwen',
  'Schouten',
  'Timmermans',
  'Verhoeven',
];

const LOCATIONS = [
  { street: 'Damrak', postalCode: '1012 LM', city: 'Amsterdam' },
  { street: 'Coolsingel', postalCode: '3011 AG', city: 'Rotterdam' },
  { street: 'Lange Voorhout', postalCode: '2514 EE', city: 'Den Haag' },
  { street: 'Oudegracht', postalCode: '3511 NP', city: 'Utrecht' },
  { street: 'Vestdijk', postalCode: '5611 CA', city: 'Eindhoven' },
  { street: 'Grote Markt', postalCode: '9711 LV', city: 'Groningen' },
  { street: 'Keizersgracht', postalCode: '8011 XA', city: 'Zwolle' },
  { street: 'Markt', postalCode: '4811 XZ', city: 'Breda' },
  { street: 'Stationsplein', postalCode: '6512 AB', city: 'Nijmegen' },
  { street: 'Wilhelminastraat', postalCode: '7511 CZ', city: 'Enschede' },
];

function toEmailPart(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, '');
}

export function buildSeedUsers(
  count: number = SEED_USER_COUNT,
  organisations: SeedOrganisation[] = SEED_ORGANISATIONS,
): SeedUser[] {
  if (organisations.length === 0) {
    throw new Error('buildSeedUsers requires at least one organisation.');
  }

  if (count < organisations.length) {
    throw new Error(
      `Cannot fill every organisation: ${count} users for ${organisations.length} organisations. ` +
        'Ask for at least as many users as there are organisations.',
    );
  }

  const generatedCount = Math.max(0, count - NAMED_USERS.length);
  const capacity = FIRST_NAMES.length * LAST_NAMES.length;
  if (generatedCount > capacity) {
    throw new Error(
      `Cannot generate ${generatedCount} users with unique names: the name pools ` +
        `allow at most ${capacity}. Add more first or last names.`,
    );
  }

  const users: SeedUser[] = [];

  for (let index = 0; index < count; index += 1) {
    const organisation = organisations[index % organisations.length];
    const round = Math.floor(index / organisations.length);
    const organisationRole: OrganisationRole =
      round < ADMINS_PER_ORGANISATION ? 'ADMIN' : 'MEMBER';

    const named = NAMED_USERS[index];
    const base = named ?? generateUser(index - NAMED_USERS.length);

    users.push({
      ...base,
      organisationId: organisation.id,
      organisationRole,
    });
  }

  return users;
}

function generateUser(
  offset: number,
): Omit<SeedUser, 'organisationId' | 'organisationRole'> {
  const name = FIRST_NAMES[offset % FIRST_NAMES.length];
  const surname = LAST_NAMES[Math.floor(offset / FIRST_NAMES.length)];
  const location = LOCATIONS[offset % LOCATIONS.length];
  const isBusiness = offset % 4 === 0;
  const kvk = String(20000000 + offset);

  return {
    name,
    surname,
    email: `${toEmailPart(name)}.${toEmailPart(surname)}@example.com`,
    address: `${location.street} ${1 + (offset % 150)}`,
    postalCode: location.postalCode,
    city: location.city,
    country: 'NL',
    ...(isBusiness ? { kvk, vatNumber: `NL${kvk}B01` } : {}),
  };
}
