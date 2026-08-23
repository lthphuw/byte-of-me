/**
 * What this spec defends: day photos land under a prefix of their own, in the
 * private bucket's namespace, keyed by the day they belong to — so a key names
 * its own owner and its own date without a database lookup.
 */
import { describe, expect, it } from 'bun:test';

import { dayPhotoFileKey } from './storage-key';

describe('dayPhotoFileKey', () => {
  it('nests under the owner, then health/days, then the day', () => {
    const key = dayPhotoFileKey('user-1', '2026-08-22', 'jpg');
    expect(key).toStartWith('users/user-1/health/days/2026-08-22/');
    expect(key).toEndWith('.jpg');
  });

  it('does not collide with the note attachment prefix', () => {
    const key = dayPhotoFileKey('user-1', '2026-08-22', 'png');
    expect(key).not.toInclude('/notes/');
  });

  it('is unique per call', () => {
    const a = dayPhotoFileKey('user-1', '2026-08-22', 'png');
    const b = dayPhotoFileKey('user-1', '2026-08-22', 'png');
    expect(a).not.toBe(b);
  });
});
