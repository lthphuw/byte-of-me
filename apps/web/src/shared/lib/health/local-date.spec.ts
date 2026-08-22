/**
 * What this spec defends: a sleep that crosses midnight lands on the day it
 * ENDS, and the calendar day is resolved in the owner's zone rather than UTC.
 * Getting this wrong shifts every statistic by a day for anyone east of UTC.
 */
import { describe, expect, it } from 'bun:test';

import { addDays, localDateKey, toLocalDate } from './local-date';

describe('toLocalDate', () => {
  it('resolves the calendar day in the given zone, not UTC', () => {
    // 2026-08-22T00:10 in Ho Chi Minh (UTC+7) is 2026-08-21T17:10Z.
    const instant = new Date('2026-08-21T17:10:00.000Z');
    expect(localDateKey(toLocalDate(instant, 'Asia/Ho_Chi_Minh'))).toBe('2026-08-22');
    expect(localDateKey(toLocalDate(instant, 'UTC'))).toBe('2026-08-21');
  });

  it('returns UTC midnight so the value round-trips through a DATE column', () => {
    const d = toLocalDate(new Date('2026-08-21T17:10:00.000Z'), 'Asia/Ho_Chi_Minh');
    expect(d.toISOString()).toBe('2026-08-22T00:00:00.000Z');
  });

  it('keeps a late-evening instant on the same day', () => {
    const instant = new Date('2026-08-22T16:40:00.000Z'); // 23:40 local
    expect(localDateKey(toLocalDate(instant, 'Asia/Ho_Chi_Minh'))).toBe('2026-08-22');
  });
});

describe('addDays', () => {
  it('moves whole UTC days without drifting', () => {
    const d = new Date('2026-08-22T00:00:00.000Z');
    expect(localDateKey(addDays(d, -14))).toBe('2026-08-08');
    expect(localDateKey(addDays(d, 1))).toBe('2026-08-23');
  });
});
