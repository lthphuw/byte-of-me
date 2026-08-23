import * as z from 'zod';

/**
 * NOTE ON ZOD VERSION: this repo is on zod 3.25.76, where the `z.iso.*`
 * namespace does not exist — it arrived in zod 4 and throws at runtime here.
 * `z.string().date()` and `z.string().datetime()` are the versions that work.
 */

/**
 * Mirrors the private `isValidTimeZone` in the sleep and workout schemas.
 *
 * A third copy rather than a shared import because both of those are
 * module-private and both slices are frozen. It exists so a malformed zone
 * fails at the boundary with a validation message instead of throwing from
 * inside `toLocalDate`, where it would surface as a generic 500.
 */
function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * The shortest window worth asking the question over.
 *
 * Four weeks is about the least that can contain twenty paired days once rest
 * days are taken out of it, and twenty is the floor every coefficient is gated
 * on. It is deliberately NOT derived from `CORRELATION_MIN_PAIRS`: this module
 * is re-exported through the slice barrel, and importing the statistics module
 * to reach one integer would drag the whole of it into any client bundle that
 * touches the barrel. The two numbers measure different things anyway — a
 * window length against a count of paired observations.
 */
const MIN_WINDOW_DAYS = 28;

/**
 * How much history the correlation covers, and the zone the calendar days are
 * resolved in.
 *
 * Bounded at both ends, like every other health read: a caller must not be
 * able to turn this into an unbounded scan of two tables plus their joins.
 */
export const sleepTrainingCorrelationSchema = z.object({
  days: z.number().int().min(MIN_WINDOW_DAYS).max(365),
  timeZone: z.string().min(1).refine(isValidTimeZone, 'Unknown time zone'),
});

export type SleepTrainingCorrelationInput = z.infer<
  typeof sleepTrainingCorrelationSchema
>;
