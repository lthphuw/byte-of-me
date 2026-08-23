import {
  EQUIPMENT,
  type Equipment,
  METRICS,
  type Metric,
  MUSCLES,
  type Muscle,
} from '@byte-of-me/db/gym-vocabulary';
import * as z from 'zod';

/**
 * NOTE ON ZOD VERSION: this repo is on zod 3.25.76, where the `z.iso.*`
 * namespace does not exist — it arrived in zod 4 and throws at runtime here.
 * Use `z.string().date()` and `z.string().datetime()`, as
 * `sleep-log-schema.ts` does.
 */

/**
 * The controlled vocabularies, re-exported from `@byte-of-me/db/gym-vocabulary`
 * under this slice's own names.
 *
 * They used to be a hand-maintained copy of the seed's list, kept in step by a
 * comment. That lasted exactly one commit before drifting on five codes, and
 * the failure was silent: seeded rows read back fine, disappeared from the
 * muscle filter, and rejected the first time the edit form opened. One const
 * makes that a build error instead.
 *
 * Imported from the `/gym-vocabulary` subpath, never the package root — the
 * root runs `dotenv/config`, throws without `DATABASE_URL` and constructs a
 * PrismaClient at module scope, none of which belongs in a client component
 * that only needs a list of muscle names.
 */
export const MUSCLE_GROUPS = MUSCLES;
export type MuscleGroup = Muscle;

export const EQUIPMENT_TYPES = EQUIPMENT;
export type EquipmentType = Equipment;

export const EXERCISE_METRICS = METRICS;
export type ExerciseMetric = Metric;

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
