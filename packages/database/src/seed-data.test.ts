import { describe, expect, it } from 'vitest';
import {
  ADMINS_PER_ORGANISATION,
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

  it('gives every organisation its own admins', () => {
    expect(ADMINS_PER_ORGANISATION).toBeGreaterThan(0);

    for (const org of SEED_ORGANISATIONS) {
      const admins = users.filter(
        (user) =>
          user.organisationId === org.id && user.organisationRole === 'ADMIN',
      );

      expect(admins).toHaveLength(ADMINS_PER_ORGANISATION);
    }
  });

  it('leaves the rest of each organisation as plain MEMBERs', () => {
    for (const org of SEED_ORGANISATIONS) {
      const inOrg = users.filter((user) => user.organisationId === org.id);
      const members = inOrg.filter((user) => user.organisationRole === 'MEMBER');

      expect(members).toHaveLength(inOrg.length - ADMINS_PER_ORGANISATION);
    }
  });

  it('only ever uses ADMIN and MEMBER — OWNER no longer exists', () => {
    const roles = new Set(users.map((user) => user.organisationRole));

    expect([...roles].sort()).toEqual(['ADMIN', 'MEMBER']);
  });

  it('scopes admins to a single organisation — no cross-organisation admin', () => {
    const organisationsPerAdmin = new Map<string, Set<string>>();
    for (const user of users) {
      if (user.organisationRole !== 'ADMIN') continue;
      const seen = organisationsPerAdmin.get(user.email) ?? new Set<string>();
      seen.add(user.organisationId);
      organisationsPerAdmin.set(user.email, seen);
    }

    expect(organisationsPerAdmin.size).toBe(
      SEED_ORGANISATIONS.length * ADMINS_PER_ORGANISATION,
    );
    for (const seen of organisationsPerAdmin.values()) {
      expect(seen.size).toBe(1);
    }
  });

  it('degrades gracefully when there are too few users to fill the admin slots', () => {
    // One user per organisation: too few for the full admin quota, but each
    // organisation must still end up with an admin who can manage it.
    const small = buildSeedUsers(SEED_ORGANISATIONS.length);

    for (const org of SEED_ORGANISATIONS) {
      const inOrg = small.filter((user) => user.organisationId === org.id);

      expect(inOrg).toHaveLength(1);
      expect(inOrg[0]?.organisationRole).toBe('ADMIN');
    }
  });

  it('never leaves an organisation without at least one admin', () => {
    for (const count of [
      SEED_ORGANISATIONS.length,
      SEED_ORGANISATIONS.length * 3,
      SEED_USER_COUNT,
    ]) {
      const built = buildSeedUsers(count);

      for (const org of SEED_ORGANISATIONS) {
        const admins = built.filter(
          (user) =>
            user.organisationId === org.id && user.organisationRole === 'ADMIN',
        );

        expect(admins.length).toBeGreaterThan(0);
      }
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
