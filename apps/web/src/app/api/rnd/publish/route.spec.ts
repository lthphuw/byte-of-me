import { describe, expect, it } from 'bun:test';

import { isAuthorizedRndToken } from './route';

describe('isAuthorizedRndToken', () => {
  const token = 'a'.repeat(40);

  it('rejects when no token is configured, rather than allowing everything', () => {
    expect(isAuthorizedRndToken(`Bearer ${token}`, undefined)).toBe(false);
  });

  it('rejects a missing header', () => {
    expect(isAuthorizedRndToken(null, token)).toBe(false);
  });

  it('rejects a header without the Bearer scheme', () => {
    expect(isAuthorizedRndToken(token, token)).toBe(false);
  });

  it('rejects a wrong token of the same length', () => {
    expect(isAuthorizedRndToken(`Bearer ${'b'.repeat(40)}`, token)).toBe(false);
  });

  it('rejects a wrong token of a different length without throwing', () => {
    expect(isAuthorizedRndToken('Bearer short', token)).toBe(false);
  });

  it('accepts the configured token', () => {
    expect(isAuthorizedRndToken(`Bearer ${token}`, token)).toBe(true);
  });
});
