/**
 * What this spec defends: every stored minute count lands in exactly one
 * bucket, the boundaries fall on the side the labels claim, "no answer" stays
 * distinct from zero, and each bucket stores a value its own range contains —
 * so a tap and a redisplay cannot disagree.
 */
import { describe, expect, it } from 'bun:test';

import { AWAKE_BUCKETS, bucketIdOf, LATENCY_BUCKETS } from './sleep-buckets';

describe('bucketIdOf', () => {
  it('reports no bucket for an unanswered field', () => {
    expect(bucketIdOf(null, LATENCY_BUCKETS)).toBeNull();
    expect(bucketIdOf(null, AWAKE_BUCKETS)).toBeNull();
  });

  it('places latency on the low side of each boundary', () => {
    expect(bucketIdOf(0, LATENCY_BUCKETS)).toBe('lt5');
    expect(bucketIdOf(4, LATENCY_BUCKETS)).toBe('lt5');
    expect(bucketIdOf(5, LATENCY_BUCKETS)).toBe('from5');
    expect(bucketIdOf(15, LATENCY_BUCKETS)).toBe('from15');
    expect(bucketIdOf(30, LATENCY_BUCKETS)).toBe('from30');
    expect(bucketIdOf(60, LATENCY_BUCKETS)).toBe('from60');
    expect(bucketIdOf(600, LATENCY_BUCKETS)).toBe('from60');
  });

  it('keeps zero minutes awake apart from a short waking', () => {
    expect(bucketIdOf(0, AWAKE_BUCKETS)).toBe('zero');
    expect(bucketIdOf(1, AWAKE_BUCKETS)).toBe('lt15');
    expect(bucketIdOf(30, AWAKE_BUCKETS)).toBe('from30');
  });

  it('stores a value that redisplays as the bucket it came from', () => {
    for (const buckets of [LATENCY_BUCKETS, AWAKE_BUCKETS]) {
      for (const bucket of buckets) {
        expect(bucketIdOf(bucket.value, buckets)).toBe(bucket.id);
      }
    }
  });
});
