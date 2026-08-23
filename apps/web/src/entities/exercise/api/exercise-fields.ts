import type { Prisma } from '@byte-of-me/db';

import type { ExerciseRow, RoutineRow } from '@/entities/exercise/model/types';
import { decimalToNumber } from '@/shared/lib/decimal';

/**
 * The selects and the row mappers, in one place.
 *
 * Deliberately NOT a `'use server'` module — it exports plain objects and
 * synchronous functions, which a server-action file may not. It is also
 * deliberately absent from `api/index.ts`: nothing outside this directory
 * should reach a Prisma select shape.
 *
 * One copy rather than one per action because a select that drifts between
 * the create and the read hands the client two different shapes for the same
 * row, and only the second one matches the declared type.
 */

export const EXERCISE_SELECT = {
  id: true,
  name: true,
  primaryMuscle: true,
  secondaryMuscles: true,
  equipment: true,
  metric: true,
  isArchived: true,
} as const satisfies Prisma.ExerciseSelect;

/** Ordered by `position`, ascending — the order the routine is performed in.
 *  Sorting here rather than in the component keeps the ordering in one place,
 *  and `idx_routine_exercises_routine_position` serves it directly. */
export const ROUTINE_SELECT = {
  id: true,
  name: true,
  notes: true,
  position: true,
  isArchived: true,
  items: {
    orderBy: { position: 'asc' },
    select: {
      id: true,
      position: true,
      exerciseId: true,
      targetSets: true,
      targetRepsLow: true,
      targetRepsHigh: true,
      targetRpe: true,
      restSec: true,
      // Narrow, never `include: { exercise: true }`: a routine needs three
      // display fields off the catalog entry, not its timestamps and archive
      // flag.
      exercise: {
        select: { name: true, primaryMuscle: true, metric: true },
      },
    },
  },
} as const satisfies Prisma.RoutineSelect;

type SelectedRoutine = Prisma.RoutineGetPayload<{
  select: typeof ROUTINE_SELECT;
}>;

/** Flattens the nested exercise and converts `targetRpe` out of `Decimal`,
 *  which does not survive serialization (`shared/lib/decimal.ts`). */
export function toRoutineRow(routine: SelectedRoutine): RoutineRow {
  return {
    id: routine.id,
    name: routine.name,
    notes: routine.notes,
    position: routine.position,
    isArchived: routine.isArchived,
    items: routine.items.map((item) => ({
      id: item.id,
      position: item.position,
      exerciseId: item.exerciseId,
      exerciseName: item.exercise.name,
      primaryMuscle: item.exercise.primaryMuscle,
      metric: item.exercise.metric,
      targetSets: item.targetSets,
      targetRepsLow: item.targetRepsLow,
      targetRepsHigh: item.targetRepsHigh,
      targetRpe: decimalToNumber(item.targetRpe),
      restSec: item.restSec,
    })),
  };
}

/** The catalog row carries no `Date` and no `Decimal`, so this is an identity
 *  in practice — it exists so a future column cannot be added to the select
 *  without passing through a converter. */
export function toExerciseRow(
  exercise: Prisma.ExerciseGetPayload<{ select: typeof EXERCISE_SELECT }>
): ExerciseRow {
  return exercise;
}
