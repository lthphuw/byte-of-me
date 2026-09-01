/**
 * The coarse answers the two optional minute fields accept, and the single
 * number each one stores.
 *
 * The Consensus Sleep Diary instructs the diarist not to watch the clock and
 * to give a best estimate, so a bucket is a MORE faithful record than a minute
 * spinner, not a lossy one — and it costs no native keyboard, which on a phone
 * covers the sticky footer the Save button lives in.
 */

/** One answer: every value below `to` belongs to it, and picking it stores
 *  `value` — the midpoint of the range, rounded up on a half. */
export interface SleepBucket {
  id: string;
  /** Exclusive upper bound in minutes. `Infinity` closes the last bucket. */
  to: number;
  value: number;
}

/** `<5 / 5–15 / 15–30 / 30–60 / 60+`. The open top bucket stores 75, the
 *  midpoint of 60–90 — past 90 minutes the figure is a clinical signal rather
 *  than a diary entry, and nothing here reads it that finely. */
export const LATENCY_BUCKETS: readonly SleepBucket[] = [
  { id: 'lt5', to: 5, value: 3 },
  { id: 'from5', to: 15, value: 10 },
  { id: 'from15', to: 30, value: 23 },
  { id: 'from30', to: 60, value: 45 },
  { id: 'from60', to: Infinity, value: 75 },
];

/** `0 / <15 / 15–30 / 30+`. Zero is its own answer: "did not wake" is a claim
 *  the efficiency figure is entitled to use, and it is not the same as the
 *  absence of an answer. */
export const AWAKE_BUCKETS: readonly SleepBucket[] = [
  { id: 'zero', to: 1, value: 0 },
  { id: 'lt15', to: 15, value: 8 },
  { id: 'from15', to: 30, value: 23 },
  { id: 'from30', to: Infinity, value: 45 },
];

/**
 * `0 / 1 / 2 / 3+`. A COUNT, not minutes — four brief wakings and one long one
 * can share a minute total and are not the same night. The open bucket stores
 * 3: it is the floor of the range and the only figure the answer guarantees.
 */
export const AWAKENINGS_COUNT_BUCKETS: readonly SleepBucket[] = [
  { id: 'zero', to: 1, value: 0 },
  { id: 'one', to: 2, value: 1 },
  { id: 'two', to: 3, value: 2 },
  { id: 'threePlus', to: Infinity, value: 3 },
];

/**
 * Which bucket a stored minute count falls in, or null when nothing is stored.
 *
 * A row written before the chips existed still lights the right one, and it
 * keeps its exact value unless the reader taps — the chip writes a midpoint,
 * displaying one never does.
 */
export function bucketIdOf(
  value: number | null,
  buckets: readonly SleepBucket[]
): string | null {
  if (value === null) return null;

  return buckets.find((bucket) => value < bucket.to)?.id ?? null;
}

/** What a chip stores, or null to clear. The inverse of `bucketIdOf`, and the
 *  only other direction anything needs. */
export function bucketValueOf(
  id: string | null,
  buckets: readonly SleepBucket[]
): number | null {
  if (id === null) return null;

  return buckets.find((bucket) => bucket.id === id)?.value ?? null;
}
