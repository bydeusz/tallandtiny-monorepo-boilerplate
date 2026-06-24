import { describe, it, expect } from 'vitest';
import { extractOrganisationList } from './organisation-response';

const meta = {
  page: 1, limit: 10, total: 1, totalPages: 1,
  hasNextPage: false, hasPreviousPage: false,
};

describe('organisation-response helpers', () => {
  it('extracts the organisation array', () => {
    const payload = { meta, data: [{ id: 'org-1', name: 'Acme' }] } as never;
    expect(extractOrganisationList(payload)).toEqual([{ id: 'org-1', name: 'Acme' }]);
  });

  it('returns [] when data is missing', () => {
    expect(extractOrganisationList({ meta } as never)).toEqual([]);
  });

  it('returns [] for undefined payload', () => {
    expect(extractOrganisationList(undefined)).toEqual([]);
  });
});
