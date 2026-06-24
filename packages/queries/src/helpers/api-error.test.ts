import { describe, it, expect } from 'vitest';
import { extractErrorMessage } from './api-error';

describe('extractErrorMessage', () => {
  it('reads a string message from an axios error envelope', () => {
    const err = { response: { data: { message: 'Invalid credentials' } } };
    expect(extractErrorMessage(err)).toBe('Invalid credentials');
  });

  it('joins an array message', () => {
    const err = { response: { data: { message: ['a', 'b'] } } };
    expect(extractErrorMessage(err)).toBe('a, b');
  });

  it('falls back to Error.message', () => {
    expect(extractErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns null when nothing usable is present', () => {
    expect(extractErrorMessage({})).toBeNull();
  });
});
