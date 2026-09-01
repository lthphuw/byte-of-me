/**
 * What this spec defends: the boundary the server action trusts. A typed
 * parameter is a compile-time promise only — every rule here is the runtime
 * one, and the chronological rule `bed ≤ wake ≤ rise` is the one a form can
 * break by hand.
 */
import { describe, expect, it } from 'bun:test';

import { NAP_BUCKETS, sleepLogUpsertSchema } from './sleep-log-schema';

const valid = {
  bedAt: '2026-08-21T16:40:00.000Z',
  wakeAt: '2026-08-22T00:10:00.000Z',
  riseAt: '2026-08-22T00:40:00.000Z',
  latencyMin: 15,
  awakeningsMin: null,
  awakeningsCount: 2,
  quality: 4,
  restedness: 3,
  napBucket: 'lt30',
  note: null,
  isFreeDay: false,
  factors: ['caffeine_late'],
  timeZone: 'Asia/Ho_Chi_Minh',
};

const parse = (over: Record<string, unknown> = {}) =>
  sleepLogUpsertSchema.safeParse({ ...valid, ...over });

describe('sleepLogUpsertSchema', () => {
  it('accepts a fully answered night', () => {
    expect(parse().success).toBe(true);
  });

  describe('bed <= wake <= rise', () => {
    it('rejects a wake time at or before the bed time', () => {
      expect(parse({ wakeAt: valid.bedAt }).success).toBe(false);
      expect(parse({ wakeAt: '2026-08-21T10:00:00.000Z' }).success).toBe(false);
    });

    it('rejects a rise time before the wake time', () => {
      expect(parse({ riseAt: '2026-08-22T00:09:00.000Z' }).success).toBe(false);
    });

    it('accepts getting up at the moment of waking', () => {
      // The commonest answer, and what the form sends by default.
      expect(parse({ riseAt: valid.wakeAt }).success).toBe(true);
    });

    it('accepts a null rise time, for a row that predates the column', () => {
      expect(parse({ riseAt: null }).success).toBe(true);
    });

    it('rejects more than 24 hours in bed', () => {
      expect(parse({ riseAt: '2026-08-23T00:00:00.000Z' }).success).toBe(false);
    });
  });

  describe('restedness', () => {
    it('accepts 1 through 5 and null', () => {
      for (const value of [1, 2, 3, 4, 5, null]) {
        expect(parse({ restedness: value }).success).toBe(true);
      }
    });

    it('rejects 0, 6 and a fraction', () => {
      expect(parse({ restedness: 0 }).success).toBe(false);
      expect(parse({ restedness: 6 }).success).toBe(false);
      expect(parse({ restedness: 3.5 }).success).toBe(false);
    });
  });

  describe('awakeningsCount', () => {
    it('accepts zero — "did not wake" is an answer, not an absence', () => {
      expect(parse({ awakeningsCount: 0 }).success).toBe(true);
    });

    it('rejects a negative count and an implausible ceiling', () => {
      expect(parse({ awakeningsCount: -1 }).success).toBe(false);
      expect(parse({ awakeningsCount: 21 }).success).toBe(false);
    });
  });

  describe('napBucket', () => {
    it('accepts every published id', () => {
      for (const id of NAP_BUCKETS) {
        expect(parse({ napBucket: id }).success).toBe(true);
      }
    });

    it('rejects anything else, including a bare minute count', () => {
      expect(parse({ napBucket: 'all_day' }).success).toBe(false);
      expect(parse({ napBucket: 45 }).success).toBe(false);
    });
  });

  it('refuses a client-supplied loggedAt by never reading one', () => {
    const res = parse({ loggedAt: '2020-01-01T00:00:00.000Z' });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('expected success');
    expect(res.data).not.toHaveProperty('loggedAt');
  });

  it('still rejects an unknown time zone', () => {
    expect(parse({ timeZone: 'Mars/Olympus' }).success).toBe(false);
  });
});
