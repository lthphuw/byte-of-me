import * as z from 'zod';

/**
 * NOTE ON ZOD VERSION: this repo is on zod 3.25.76, where the `z.iso.*`
 * namespace does not exist — it arrived in zod 4 and throws at runtime here.
 * `z.string().datetime()` and `z.string().date()` are the versions that work.
 *
 * Dates cross the server-action boundary as ISO STRINGS in both directions. A
 * server action's arguments and return value are serialized, so a `Date` in
 * either position is a compile-time promise the runtime does not keep — this
 * schema is the runtime guarantee (AGENTS §8).
 */

/**
 * Mirrors the private `isValidTimeZone` in
 * `entities/sleep-log/model/sleep-log-schema.ts`.
 *
 * A copy rather than a shared import because that one is module-private and
 * the sleep slice is frozen. It exists at all so a malformed zone fails at the
 * boundary with a validation message instead of throwing from inside
 * `toLocalDate`, where it would surface as a generic 500.
 */
function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const timeZone = z.string().min(1).refine(isValidTimeZone, 'Unknown time zone');

const id = z.string().min(1);

/**
 * Half-point RPE, the granularity the scale is actually used at.
 *
 * Stored in a `Decimal(3,1)`, so `multipleOf(0.5)` is safe here where a
 * two-decimal check would not be: 0.5 is exactly representable in binary
 * floating point and zod's modulo test is exact for it.
 */
const rpe = z.number().min(0).max(10).multipleOf(0.5).nullable().default(null);

/**
 * Kilograms, to two decimal places — the precision of `Decimal(6,2)`.
 *
 * `multipleOf(0.01)` is NOT used: zod tests it by modulo, and 102.55 % 0.01 is
 * not 0 in binary floating point, so a legitimate plate weight would be
 * rejected. Rounding to two places and comparing is exact for every value the
 * column can hold. Without the check Postgres would round silently, which is
 * how a volume total starts disagreeing with the numbers that were entered.
 */
const weightKg = z
  .number()
  .min(0)
  .max(9999.99)
  .refine((v) => Math.round(v * 100) / 100 === v, {
    message: 'weightKg is limited to two decimal places',
  })
  .nullable()
  .default(null);

/**
 * Start a session, from a routine or empty.
 *
 * `localDate` is absent on purpose and is derived server-side from
 * `startedAt` in this zone — it is the column phase 3 joins sleep and training
 * on, and letting the client name the day would put it under the caller's
 * control. A workout belongs to the day it STARTED; a sleep to the day it
 * ENDED (`shared/lib/health/local-date.ts` owns that asymmetry).
 *
 * `title` is required only when there is no routine: with one, the action
 * snapshots the routine's name instead, because `WorkoutSession.title` is a
 * snapshot rather than merely a foreign key — deleting the "Push Day" routine
 * must not blank the heading of sixty past sessions.
 */
export const workoutStartSchema = z
  .object({
    routineId: id.nullable().default(null),
    title: z.string().trim().min(1).max(120).nullable().default(null),
    startedAt: z.string().datetime(),
    timeZone,
  })
  .refine((v) => v.routineId !== null || v.title !== null, {
    message: 'title is required when no routine is chosen',
    path: ['title'],
  });

export type WorkoutStartInput = z.infer<typeof workoutStartSchema>;

export const workoutSessionIdSchema = z.object({ id });

export type WorkoutSessionIdInput = z.infer<typeof workoutSessionIdSchema>;

/** A read window over `localDate`. Inclusive at both ends and bounded at both,
 *  so a caller cannot turn the history read into an unbounded table scan. */
export const workoutRangeSchema = z
  .object({
    from: z.string().date(),
    to: z.string().date(),
  })
  .refine((v) => v.from <= v.to, {
    message: 'from must not be after to',
    path: ['from'],
  });

export type WorkoutRangeInput = z.infer<typeof workoutRangeSchema>;

const setFields = {
  reps: z.number().int().min(0).max(1000).nullable().default(null),
  weightKg,
  rpe,
  durationSec: z.number().int().min(0).max(86_400).nullable().default(null),
  /** EXCLUDES the set from volume, from PR detection and from the per-muscle
   *  set count. Without it every hypertrophy number inflates with warm-ups. */
  isWarmup: z.boolean().default(false),
  /** When the set was marked done, which is what makes real rest intervals
   *  recoverable after the fact. Null while it is still being entered. */
  completedAt: z.string().datetime().nullable().default(null),
};

/** `position` is absent for the same reason it is absent from a routine item:
 *  the server appends, so two sets logged in quick succession cannot collide
 *  on a position nothing constrains. */
export const workoutSetAddSchema = z.object({
  workoutExerciseId: id,
  ...setFields,
});

export type WorkoutSetAddInput = z.infer<typeof workoutSetAddSchema>;

export const workoutSetUpdateSchema = z.object({ id, ...setFields });

export type WorkoutSetUpdateInput = z.infer<typeof workoutSetUpdateSchema>;

export const workoutSetIdSchema = z.object({ id });

export type WorkoutSetIdInput = z.infer<typeof workoutSetIdSchema>;

export const workoutExerciseAddSchema = z.object({
  sessionId: id,
  exerciseId: id,
  notes: z.string().max(2000).nullable().default(null),
});

export type WorkoutExerciseAddInput = z.infer<typeof workoutExerciseAddSchema>;

/**
 * Reorder takes the COMPLETE list, not a from/to pair.
 *
 * A pairwise move would have to shift the rows between the two ends, and the
 * only way to know which those are is to read them all anyway. Sending the
 * whole order makes the write idempotent and makes a partial list — which
 * would leave duplicate positions behind — detectable: the action rejects any
 * list that is not exactly the session's own exercises.
 */
export const workoutExerciseReorderSchema = z.object({
  sessionId: id,
  orderedIds: z.array(id).min(1).max(60),
});

export type WorkoutExerciseReorderInput = z.infer<
  typeof workoutExerciseReorderSchema
>;

export const workoutExerciseIdSchema = z.object({ id });

export type WorkoutExerciseIdInput = z.infer<typeof workoutExerciseIdSchema>;

/**
 * Close a session.
 *
 * `endedAt` is what "finished" means — the schema carries no status column,
 * because a nullable end time already answers the question the app opens
 * with. `sessionRpe` is Foster session-RPE, 0..10; multiplied by duration it
 * gives training load, which is the only reason it is asked for at the end
 * rather than per set.
 */
export const workoutFinishSchema = z.object({
  id,
  endedAt: z.string().datetime(),
  sessionRpe: rpe,
  notes: z.string().max(2000).nullable().default(null),
});

export type WorkoutFinishInput = z.infer<typeof workoutFinishSchema>;
