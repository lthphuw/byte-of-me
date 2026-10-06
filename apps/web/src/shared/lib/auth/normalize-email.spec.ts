/**
 * `normalizeEmail` is the single rule every email comparison in this app goes
 * through — the owner gate and the sign-in form. The
 * contract is that two spellings of one address compare equal, and that an
 * absent address is never equal to anything.
 */
import { describe, expect, it } from 'bun:test';

import { normalizeEmail } from './normalize-email';

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Ada@Example.COM ')).toBe('ada@example.com');
  });

  it('returns an empty string for an absent address', () => {
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail(undefined)).toBe('');
    expect(normalizeEmail('   ')).toBe('');
  });
});
