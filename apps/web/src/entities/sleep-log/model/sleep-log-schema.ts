import * as z from 'zod';

import { isValidTimeZone } from '@/shared/lib/health/local-date';

/** ZOD 3.25.76: no `z.iso.*` namespace (that is zod 4). Use
 *  `z.string().date()` for `2026-08-22` and `z.string().datetime()` for a
 *  full timestamp — verified against the installed copy. */

/**
 * Contributing factors as codes, in a `String[]` validated here rather than a
 * Postgres enum — the list grows as the author notices patterns, and a
 * migration per factor is not worth it. Labels live in the locale files.
 */
export const SLEEP_FACTORS = [
  'caffeine_late',
  'alcohol',
  'screen_late',
  'late_meal',
  'workout_late',
  'ill',
] as const;

export type SleepFactor = (typeof SLEEP_FACTORS)[number];

/**
 * Daytime naps as an ordered id, never a midpoint: `gt60` is open at the top
 * and has none, and a minutes-shaped total invites being added to the night.
 * Ordered least to most, so `buildSuggestion`'s median is the middle ANSWER.
 */
export const NAP_BUCKETS = ['none', 'lt30', '30to60', 'gt60'] as const;

export type NapBucket = (typeof NAP_BUCKETS)[number];

/** More than this in one night is a typo. The chip row offers 0–3+, so this
 *  only bounds a hand-built payload. */
const MAX_AWAKENINGS_COUNT = 20;

/**
 * The write. Dates cross as ISO strings — typed params are a compile-time
 * promise only, and this schema is the runtime guarantee (§8).
 *
 * `timeZone` is client-sent because `localDate` resolves in the OWNER's zone,
 * and validated against the Intl database rather than trusted. `loggedAt` is
 * ABSENT on purpose: it is evidence ABOUT the entry, so the server stamps it.
 */
export const sleepLogUpsertSchema = z
  .object({
    bedAt: z.string().datetime(),
    wakeAt: z.string().datetime(),
    /** Out of bed. Nullable because rows written before the column existed
     *  have none, and `sleep-stats.ts` falls back to `wakeAt` for those. */
    riseAt: z.string().datetime().nullable(),
    latencyMin: z.number().int().min(0).max(720).nullable(),
    awakeningsMin: z.number().int().min(0).max(720).nullable(),
    awakeningsCount: z.number().int().min(0).max(MAX_AWAKENINGS_COUNT).nullable(),
    quality: z.number().int().min(1).max(5).nullable(),
    restedness: z.number().int().min(1).max(5).nullable(),
    napBucket: z.enum(NAP_BUCKETS).nullable(),
    note: z.string().max(2000).nullable(),
    isFreeDay: z.boolean(),
    factors: z.array(z.enum(SLEEP_FACTORS)).max(SLEEP_FACTORS.length),
    timeZone: z.string().min(1).refine(isValidTimeZone, 'Unknown time zone'),
  })
  .refine((v) => new Date(v.wakeAt) > new Date(v.bedAt), {
    message: 'wakeAt must be after bedAt',
    path: ['wakeAt'],
  })
  .refine(
    (v) =>
      new Date(v.wakeAt).getTime() - new Date(v.bedAt).getTime() <=
      24 * 60 * 60 * 1000,
    { message: 'A single sleep cannot exceed 24 hours', path: ['wakeAt'] }
  )
  // The other half of `bed ≤ wake ≤ rise`. Equality is allowed: getting up the
  // moment you wake is the common answer, and it is what the form sends by
  // default. Only rise BEFORE wake is impossible.
  .refine(
    (v) => v.riseAt === null || new Date(v.riseAt) >= new Date(v.wakeAt),
    { message: 'riseAt must not be before wakeAt', path: ['riseAt'] }
  )
  .refine(
    (v) =>
      v.riseAt === null ||
      new Date(v.riseAt).getTime() - new Date(v.bedAt).getTime() <=
        24 * 60 * 60 * 1000,
    { message: 'Time in bed cannot exceed 24 hours', path: ['riseAt'] }
  );

export type SleepLogUpsertInput = z.infer<typeof sleepLogUpsertSchema>;

/** A read window. Inclusive at both ends; the caller supplies calendar days. */
export const sleepRangeSchema = z
  .object({
    from: z.string().date(),
    to: z.string().date(),
  })
  .refine((v) => v.from <= v.to, {
    message: 'from must not be after to',
    path: ['from'],
  });

export type SleepRangeInput = z.infer<typeof sleepRangeSchema>;

/** How many days of history a summary covers. Bounded so a caller cannot ask
 *  the database for an unbounded scan. */
export const sleepSummarySchema = z.object({
  days: z.number().int().min(7).max(365),
  timeZone: z.string().min(1).refine(isValidTimeZone, 'Unknown time zone'),
});

export type SleepSummaryInput = z.infer<typeof sleepSummarySchema>;

/** The insight window. Bounded at 90 days at the top because a contrast that
 *  reaches further back keeps voting with a habit the owner has since
 *  dropped, and at 14 at the bottom because the debt window is 14 nights. */
export const sleepInsightsSchema = z.object({
  days: z.number().int().min(14).max(90),
  timeZone: z.string().min(1).refine(isValidTimeZone, 'Unknown time zone'),
});

export type SleepInsightsInput = z.infer<typeof sleepInsightsSchema>;
