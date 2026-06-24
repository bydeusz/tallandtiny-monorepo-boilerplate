import { describe, it, expect, beforeEach, vi } from 'vitest';
import { refreshAccessToken, configureAuthRefresh } from './custom-axios';
import { getAccessToken, clearAccessToken } from './auth-token-store';

function jsonResponse(ok: boolean, body: unknown): Response {
  return {
    ok,
    json: async () => body,
  } as unknown as Response;
}

describe('refreshAccessToken', () => {
  beforeEach(() => {
    clearAccessToken();
    configureAuthRefresh({ endpoint: '/api/auth/refresh', onUnauthorized: () => {} });
  });

  it('stores and returns the new access token on success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(true, { access_token: 'new-token' }),
    );
    const token = await refreshAccessToken(fetchImpl as unknown as typeof fetch);
    expect(token).toBe('new-token');
    expect(getAccessToken()).toBe('new-token');
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/auth/refresh',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('returns null and does not store a token when the response is not ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(false, { message: 'nope' }));
    const token = await refreshAccessToken(fetchImpl as unknown as typeof fetch);
    expect(token).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('returns null when the success body has no access_token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(true, {}));
    const token = await refreshAccessToken(fetchImpl as unknown as typeof fetch);
    expect(token).toBeNull();
  });

  it('coalesces concurrent calls into a single fetch (single-flight)', async () => {
    let resolveFetch: (r: Response) => void = () => {};
    const fetchImpl = vi.fn().mockImplementation(
      () => new Promise<Response>((resolve) => { resolveFetch = resolve; }),
    );
    const p1 = refreshAccessToken(fetchImpl as unknown as typeof fetch);
    const p2 = refreshAccessToken(fetchImpl as unknown as typeof fetch);
    resolveFetch(jsonResponse(true, { access_token: 'shared' }));
    const [t1, t2] = await Promise.all([p1, p2]);
    expect(t1).toBe('shared');
    expect(t2).toBe('shared');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
