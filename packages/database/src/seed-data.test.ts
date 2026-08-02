import { describe, expect, it } from 'vitest';
import {
  SEED_ORGANISATIONS,
  SEED_USER_COUNT,
  buildSeedUsers,
} from './seed-data.js';

describe('SEED_ORGANISATIONS', () => {
  it('describes ten organisations', () => {
    expect(SEED_ORGANISATIONS).toHaveLength(10);
  });

  it('uses stable, unique ids so re-seeding never duplicates an organisation', () => {
    const ids = SEED_ORGANISATIONS.map((org) => org.id);

    expect(new Set(ids).size).toBe(10);
    for (const id of ids) {
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    }
  });

  it('gives every organisation a distinct name', () => {
    const names = SEED_ORGANISATIONS.map((org) => org.name);

    expect(new Set(names).size).toBe(10);
  });
});

describe('buildSeedUsers', () => {
  const users = buildSeedUsers();

  it('produces 350 users', () => {
    expect(SEED_USER_COUNT).toBe(350);
    expect(users).toHaveLength(350);
  });

  it('gives every user a unique email', () => {
    const emails = users.map((user) => user.email);

    expect(new Set(emails).size).toBe(users.length);
  });

  it('keeps the two well-known demo logins the e2e suite depends on', () => {
    const emails = users.map((user) => user.email);

    expect(emails).toContain('john.doe@example.com');
    expect(emails).toContain('lisa.visser@example.com');
  });

  it('assigns every user to one of the seeded organisations', () => {
    const organisationIds = new Set(SEED_ORGANISATIONS.map((org) => org.id));

    for (const user of users) {
      expect(organisationIds.has(user.organisationId)).toBe(true);
    }
  });

  it('spreads the users evenly so no organisation is left empty', () => {
    const perOrganisation = new Map<string, number>();
    for (const user of users) {
      perOrganisation.set(
        user.organisationId,
        (perOrganisation.get(user.organisationId) ?? 0) + 1,
      );
    }

    expect(perOrganisation.size).toBe(SEED_ORGANISATIONS.length);
    for (const org of SEED_ORGANISATIONS) {
      expect(perOrganisation.get(org.id)).toBe(35);
    }
  });

  it('gives every organisation exactly one OWNER', () => {
    for (const org of SEED_ORGANISATIONS) {
      const owners = users.filter(
        (user) =>
          user.organisationId === org.id && user.organisationRole === 'OWNER',
      );

      expect(owners).toHaveLength(1);
    }
  });

  it('is deterministic — two builds produce identical data', () => {
    expect(buildSeedUsers()).toEqual(buildSeedUsers());
  });

  it('gives every user a name, surname and address', () => {
    for (const user of users) {
      expect(user.name).not.toBe('');
      expect(user.surname).not.toBe('');
      expect(user.address).not.toBe('');
      expect(user.postalCode).not.toBe('');
      expect(user.city).not.toBe('');
      expect(user.country).toBe('NL');
    }
  });

  it('scales down to smaller counts while still filling every organisation', () => {
    const small = buildSeedUsers(20);
    const organisationIds = new Set(small.map((user) => user.organisationId));

    expect(small).toHaveLength(20);
    expect(organisationIds.size).toBe(SEED_ORGANISATIONS.length);
  });

  it('refuses a count it cannot give unique names to', () => {
    expect(() => buildSeedUsers(100_000)).toThrow(/unique/i);
  });

  it('refuses a count that cannot fill every organisation', () => {
    expect(() => buildSeedUsers(5)).toThrow(/organisation/i);
  });
});
