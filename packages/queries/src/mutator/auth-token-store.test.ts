import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
} from './auth-token-store';

describe('auth-token-store', () => {
  beforeEach(() => clearAccessToken());

  it('returns null when no token is set', () => {
    expect(getAccessToken()).toBeNull();
  });

  it('stores and returns the access token', () => {
    setAccessToken('token-abc');
    expect(getAccessToken()).toBe('token-abc');
  });

  it('clears the stored token', () => {
    setAccessToken('token-abc');
    clearAccessToken();
    expect(getAccessToken()).toBeNull();
  });

  it('setAccessToken(null) clears the token', () => {
    setAccessToken('token-abc');
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });
});
