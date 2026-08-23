import * as z from 'zod';

import { isValidTimeZone } from '@/shared/lib/health/local-date';

/**
 * NOTE ON ZOD VERSION: this repo is on zod 3.25.76, where the `z.iso.*`
 * namespace does not exist — it arrived in zod 4. Use `z.string().date()` and
 * `z.string().datetime()`. Verified against the installed copy: `.date()`
 * accepts `2026-08-22` and rejects a full ISO timestamp; `.datetime()` accepts
 * `2026-08-22T00:10:00.000Z`.
 */

/**
 * Contributing factors, as codes rather than free text.
 *
 * A `String[]` column validated here instead of a Postgres enum: the list will
 * change as the author notices new patterns, and a migration per new factor is
 * not a trade worth making. Codes rather than labels because the labels are UI
 * text and live in `dashboard.daily.factors.*` in both locale files.
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
 * The write.
 *
 * Dates cross the server-action boundary as ISO strings: a server action's
 * arguments are serialized, and typed params are a compile-time promise only —
 * this schema is the runtime guarantee (AGENTS §8).
 *
 * `timeZone` is sent by the client because `localDate` must be resolved in the
 * OWNER's zone, and the server has no reliable way to know it. It is validated
 * against the Intl database rather than trusted, so a malformed value fails
 * here instead of throwing inside `toLocalDate`.
 */
export const sleepLogUpsertSchema = z
  .object({
    bedAt: z.string().datetime(),
    wakeAt: z.string().datetime(),
    latencyMin: z.number().int().min(0).max(720).nullable(),
    awakeningsMin: z.number().int().min(0).max(720).nullable(),
    quality: z.number().int().min(1).max(5).nullable(),
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
