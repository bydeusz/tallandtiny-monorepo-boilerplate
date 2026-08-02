import type { OrganisationRole } from './generated/prisma/client.js';

/**
 * Dev seed fixtures: 10 organisations and 350 users spread across them.
 *
 * Everything here is pure data generation — no Prisma, no hashing — so the
 * shape of the seed (counts, distribution, uniqueness) is unit-testable
 * without a database. The `*.seeder.ts` files under `prisma/seeders/` do the
 * writing.
 *
 * The generated set is deterministic: the same input always yields the same
 * users, so a re-seed reproduces the exact same dev database and bookmarked
 * ids keep working.
 */

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

/** Total number of regular users the seed creates (super admins are separate). */
export const SEED_USER_COUNT = 350;

/**
 * Admins per organisation; everyone else in it is a plain MEMBER.
 *
 * These are `OrganisationRole.ADMIN` — admins *of one organisation*, able to
 * manage that organisation and nothing outside it. They are unrelated to the
 * platform-wide `Role.SUPER_ADMIN` accounts the seed creates separately; every
 * user here keeps the default platform role `USER`.
 */
export const ADMINS_PER_ORGANISATION = 4;

/** Shared password for every seeded user, so any account can be logged into. */
export const SEED_PASSWORD = 'Admin123!';

/**
 * Fixed ids rather than `@default(uuid())`: the seeder can then upsert by id,
 * which makes re-seeding idempotent (Organisation has no unique business key)
 * and keeps organisation ids stable across resets.
 */
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

/**
 * The two long-standing demo logins. They stay first in the list and keep
 * their exact emails and addresses because the api e2e suite logs in as both
 * (see `apps/api/test/organisations.e2e.test.ts`).
 */
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

// Deliberately excludes "Doe" and "Visser" so a generated user can never
// collide with one of the NAMED_USERS emails above.
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

/** "Van den Berg" -> "vandenberg", so emails stay valid local parts. */
function toEmailPart(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Build the seed users, each already assigned to an organisation.
 *
 * Users are dealt round-robin across the organisations (user `i` goes to
 * organisation `i % organisations.length`), which guarantees no organisation
 * is left empty and keeps the group sizes within one of each other.
 *
 * Their organisation role follows from the round they were dealt in: the first
 * `ADMINS_PER_ORGANISATION` users dealt to an organisation become its ADMINs
 * and everyone after that is a MEMBER. With fewer users than that the split
 * degrades gracefully — an organisation gets fewer admins, but the very first
 * user dealt to it is always one, so no organisation is ever left unmanageable.
 */
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
    // Which round of the round-robin this user was dealt in: the first few
    // rounds staff each organisation with its admins.
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

/**
 * `offset` indexes the generated users (0-based). First and last names are
 * picked so that every (first, last) pair is used at most once — that is what
 * keeps the derived emails unique without tacking a counter onto them.
 */
function generateUser(
  offset: number,
): Omit<SeedUser, 'organisationId' | 'organisationRole'> {
  const name = FIRST_NAMES[offset % FIRST_NAMES.length];
  const surname = LAST_NAMES[Math.floor(offset / FIRST_NAMES.length)];
  const location = LOCATIONS[offset % LOCATIONS.length];
  // A business identity for a quarter of the users, mirroring reality where
  // only some accounts are registered companies.
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
