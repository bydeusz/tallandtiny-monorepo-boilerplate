import { describe, it, expect } from 'vitest';
import { unwrapEnvelope } from './envelope';

describe('unwrapEnvelope', () => {
  it('returns body.data for a single-resource envelope (meta null)', () => {
    const body = {
      success: true,
      statusCode: 200,
      data: { id: 'org-1', name: 'Acme' },
      meta: null,
    };
    expect(unwrapEnvelope(body)).toEqual({ id: 'org-1', name: 'Acme' });
  });

  it('returns { data, meta } for a paginated envelope (meta object)', () => {
    const body = {
      success: true,
      statusCode: 200,
      data: [{ id: 'm-1' }],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    };
    expect(unwrapEnvelope(body)).toEqual({
      data: [{ id: 'm-1' }],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });
  });

  it('returns the body unchanged when there is no envelope (skip-transform)', () => {
    const body = { status: 'ok', info: {} };
    expect(unwrapEnvelope(body)).toEqual({ status: 'ok', info: {} });
  });

  it('returns body.data when the envelope has no meta key at all', () => {
    const body = { success: true, data: { id: 'u-1' } };
    expect(unwrapEnvelope(body)).toEqual({ id: 'u-1' });
  });
});
