import * as z from 'zod';

/**
 * NOTE ON ZOD VERSION: this repo is on zod 3.25.76, where the `z.iso.*`
 * namespace does not exist — it arrived in zod 4 and throws at runtime here.
 * Use `z.string().date()` and `z.string().datetime()`, as
 * `sleep-log-schema.ts` does.
 */

/**
 * The muscle vocabulary, as codes rather than labels.
 *
 * `Exercise.primaryMuscle` is what makes "sets per muscle per week" computable
 * at all, and a free-text column would give two spellings of the same muscle
 * two separate weekly totals — the same failure `uniq_exercises_owner_name`
 * exists to prevent for exercise names. A `String` column validated here
 * rather than a Postgres enum, for the reason `SleepLog.factors` documents:
 * this list will grow, and a migration per addition is not a trade worth
 * making. Labels are UI text and belong in the locale files.
 *
 * THIS LIST IS A COPY OF `MUSCLES` IN `packages/db/prisma/seed-exercises.ts`
 * AND MUST STAY IDENTICAL TO IT. That file writes the starter catalogue
 * straight into production, so any code it uses and this schema rejects
 * produces rows the exercise form cannot save and the muscle filter cannot
 * find — silently, since the rows read back fine. It is not imported from
 * because importing that module would EXECUTE the seed; its own header names
 * the fix (lift the three consts into `packages/db/src/`, the only directory
 * `package.json#exports` covers, and re-export them from the seed) for
 * whoever needs a third copy.
 *
 * Two groupings in it are deliberate and were nearly "corrected" here into a
 * finer set: `back` stays one code for the mid-back and erectors that rows and
 * hinges load, separate from `lats` as the vertical-pull mover, and `core` is
 * one code rather than abs/obliques — the seed's argument is that a split you
 * cannot program differently only splits the chart.
 */
export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'lats',
  'traps',
  'front_delts',
  'side_delts',
  'rear_delts',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'adductors',
  'abductors',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** Mirrors the `equipment` comment on `model Exercise`, and `EQUIPMENT` in
 *  `packages/db/prisma/seed-exercises.ts`. Same parity requirement as
 *  `MUSCLE_GROUPS` above. */
export const EQUIPMENT_TYPES = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'band',
] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

/**
 * Mirrors the `metric` comment on `model Exercise`, and `METRICS` in
 * `packages/db/prisma/seed-exercises.ts`. Same parity requirement as
 * `MUSCLE_GROUPS` above.
 *
 * Without this a plank and a pull-up break the set model: one has no reps, the
 * other no weight. Volume and e1RM read it to decide which formula even
 * applies, so it is validated rather than free text.
 */
export const EXERCISE_METRICS = [
  'weight_reps',
  'bodyweight_reps',
  'weighted_bodyweight',
  'time',
] as const;

export type ExerciseMetric = (typeof EXERCISE_METRICS)[number];

const muscleEnum = z.enum(MUSCLE_GROUPS);

/** Exercise names are compared by `uniq_exercises_owner_name`, so leading and
 *  trailing space is stripped before it ever reaches that index — "Bench
 *  Press" and "Bench Press " must not become two progression curves. */
const exerciseName = z.string().trim().min(1).max(120);

/** The catalog read. Every field optional so the unfiltered list is the
 *  default; `search` is a case-insensitive contains, not a regex. */
export const exerciseListSchema = z.object({
  search: z.string().trim().max(120).optional(),
  muscle: muscleEnum.optional(),
  /** Archived rows are hidden by default: they exist so history keeps
   *  resolving (`WorkoutExercise` uses `onDelete: Restrict`), not to be picked
   *  from a list. */
  includeArchived: z.boolean().default(false),
});

export type ExerciseListInput = z.infer<typeof exerciseListSchema>;

const exerciseFields = {
  name: exerciseName,
  primaryMuscle: muscleEnum,
  /** Any number of secondary muscles, but never the primary one twice over. */
  secondaryMuscles: z.array(muscleEnum).max(MUSCLE_GROUPS.length).default([]),
  equipment: z.enum(EQUIPMENT_TYPES),
  metric: z.enum(EXERCISE_METRICS).default('weight_reps'),
};

export const exerciseCreateSchema = z.object(exerciseFields);

export type ExerciseCreateInput = z.infer<typeof exerciseCreateSchema>;

export const exerciseUpdateSchema = z.object({
  id: z.string().min(1),
  ...exerciseFields,
});

export type ExerciseUpdateInput = z.infer<typeof exerciseUpdateSchema>;

/**
 * Archive is a toggle, not a one-way door.
 *
 * `isArchived` is carried as an argument rather than hardcoded to `true`
 * because un-archiving is the same write with the same guard, and a second
 * action would duplicate the ownership check for no gain. Nothing here
 * deletes: `WorkoutExercise.exercise` is `onDelete: Restrict` precisely so a
 * mis-click cannot take sixty sessions of history with it.
 */
export const exerciseArchiveSchema = z.object({
  id: z.string().min(1),
  isArchived: z.boolean(),
});

export type ExerciseArchiveInput = z.infer<typeof exerciseArchiveSchema>;

/**
 * One planned item inside a routine.
 *
 * `position` is deliberately absent: the client sends the items in the order
 * it wants them and the server assigns `position` from the array index. A
 * client-supplied position can collide or leave holes, and `RoutineExercise`
 * has no unique constraint on `(routineId, position)` to catch it — the list
 * would just render in an arbitrary order.
 *
 * `targetRpe` crosses as a number and is stored in a `Decimal(3,1)`, so it is
 * bounded to one decimal place here rather than silently rounded by Postgres.
 */
export const routineItemSchema = z.object({
  exerciseId: z.string().min(1),
  targetSets: z.number().int().min(1).max(20).nullable().default(null),
  targetRepsLow: z.number().int().min(1).max(200).nullable().default(null),
  targetRepsHigh: z.number().int().min(1).max(200).nullable().default(null),
  targetRpe: z.number().min(0).max(10).multipleOf(0.5).nullable().default(null),
  restSec: z.number().int().min(0).max(3600).nullable().default(null),
});

export type RoutineItemInput = z.infer<typeof routineItemSchema>;

const routineItems = z
  .array(routineItemSchema)
  .max(50)
  .default([])
  .refine(
    (items) =>
      items.every(
        (item) =>
          item.targetRepsLow === null ||
          item.targetRepsHigh === null ||
          item.targetRepsLow <= item.targetRepsHigh
      ),
    { message: 'targetRepsLow must not exceed targetRepsHigh' }
  );

export const routineListSchema = z.object({
  includeArchived: z.boolean().default(false),
});

export type RoutineListInput = z.infer<typeof routineListSchema>;

export const routineCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  notes: z.string().max(2000).nullable().default(null),
  items: routineItems,
});

export type RoutineCreateInput = z.infer<typeof routineCreateSchema>;

/**
 * A routine update REPLACES its item list.
 *
 * Diffing the incoming items against the stored ones would need stable item
 * ids the editor does not have for rows it just added, and a partial update
 * cannot express "this exercise was removed". Replacing inside one transaction
 * is atomic and leaves no half-edited routine; `RoutineExercise` carries no
 * history worth preserving — the training that happened lives in
 * `WorkoutExercise`, which is a different table for exactly this reason.
 */
export const routineUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  notes: z.string().max(2000).nullable().default(null),
  items: routineItems,
});

export type RoutineUpdateInput = z.infer<typeof routineUpdateSchema>;

export const routineArchiveSchema = z.object({
  id: z.string().min(1),
  isArchived: z.boolean(),
});

export type RoutineArchiveInput = z.infer<typeof routineArchiveSchema>;
