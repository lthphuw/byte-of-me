import * as z from 'zod';

import { isValidTimeZone } from '@/shared/lib/health/local-date';

/**
 * NOTE ON ZOD VERSION: this repo is on zod 3.25.76, where the `z.iso.*`
 * namespace does not exist — it arrived in zod 4 and throws at runtime here.
 * `z.string().date()` and `z.string().datetime()` are the versions that work.
 */

/**
 * The shortest window the gym statistics will answer over.
 *
 * ACWR needs a full 28-day chronic window before it will report at all
 * (`ACWR_CHRONIC_DAYS`), so a shorter request would render a screen whose
 * headline figure is structurally unavailable. It is deliberately NOT imported
 * from `workout-stats.ts`: this module is re-exported through the slice
 * barrel, and reaching into the statistics module for one integer would drag
 * the whole of it into any client bundle that touches the barrel.
 */
const MIN_WINDOW_DAYS = 28;

/**
 * How much training history a statistics screen reads, and the zone its
 * calendar days are resolved in.
 *
 * Bounded at both ends, like every other health read: a caller must not be
 * able to turn this into an unbounded scan of the session tree.
 */
export const gymStatsSchema = z.object({
  days: z.number().int().min(MIN_WINDOW_DAYS).max(365),
  timeZone: z.string().min(1).refine(isValidTimeZone, 'Unknown time zone'),
});

export type GymStatsInput = z.infer<typeof gymStatsSchema>;

/** One exercise's own progression, over the same kind of bounded window. */
export const exerciseProgressSchema = z.object({
  exerciseId: z.string().min(1),
  days: z.number().int().min(MIN_WINDOW_DAYS).max(365),
  timeZone: z.string().min(1).refine(isValidTimeZone, 'Unknown time zone'),
});

export type ExerciseProgressInput = z.infer<typeof exerciseProgressSchema>;
