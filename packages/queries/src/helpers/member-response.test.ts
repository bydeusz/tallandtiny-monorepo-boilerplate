import { describe, it, expect } from 'vitest';
import { extractMemberList, extractMemberListMeta } from './member-response';

const meta = {
  page: 1, limit: 10, total: 1, totalPages: 1,
  hasNextPage: false, hasPreviousPage: false,
};

describe('member-response helpers', () => {
  it('extracts the member array', () => {
    const payload = { meta, data: [{ id: 'm-1' }] } as never;
    expect(extractMemberList(payload)).toEqual([{ id: 'm-1' }]);
  });

  it('returns [] when data is missing', () => {
    const payload = { meta } as never;
    expect(extractMemberList(payload)).toEqual([]);
  });

  it('returns [] for undefined payload', () => {
    expect(extractMemberList(undefined)).toEqual([]);
  });

  it('extracts pagination meta', () => {
    const payload = { meta, data: [] } as never;
    expect(extractMemberListMeta(payload)).toEqual(meta);
  });

  it('returns null meta for undefined payload', () => {
    expect(extractMemberListMeta(undefined)).toBeNull();
  });
});
