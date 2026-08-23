import type { Prisma } from '@byte-of-me/db';

import type {
  WorkoutExerciseRow,
  WorkoutSessionDetail,
  WorkoutSessionRow,
  WorkoutSetRow,
} from '@/entities/workout/model/types';
import { decimalToNumber } from '@/shared/lib/decimal';
import { localDateKey } from '@/shared/lib/health/local-date';

/**
 * The selects and the row mappers for this slice, in one place.
 *
 * Deliberately NOT a `'use server'` module — it exports plain objects and
 * synchronous functions, which a server-action file may not — and deliberately
 * absent from `api/index.ts`, since nothing outside this directory should
 * reach a Prisma select shape.
 *
 * One copy rather than one per action: eight actions return one of these three
 * shapes, and a select that drifts between the write and the read hands the
 * client two different objects for the same row, only one of which matches the
 * declared type.
 */

export const SET_SELECT = {
  id: true,
  position: true,
  reps: true,
  weightKg: true,
  rpe: true,
  durationSec: true,
  isWarmup: true,
  completedAt: true,
} as const satisfies Prisma.WorkoutSetSelect;

export const WORKOUT_EXERCISE_SELECT = {
  id: true,
  position: true,
  notes: true,
  exerciseId: true,
  // Narrow, never `include: { exercise: true }`: the logging screen needs
  // three display fields off the catalog entry, not its timestamps and
  // archive flag.
  exercise: {
    select: { name: true, primaryMuscle: true, equipment: true, metric: true },
  },
  sets: { orderBy: { position: 'asc' }, select: SET_SELECT },
} as const satisfies Prisma.WorkoutExerciseSelect;

/** The history-list shape. `_count` rather than the exercises themselves — a
 *  list of sessions never needs their sets, and loading them to count them is
 *  how a month of history becomes a thousand rows. */
export const SESSION_LIST_SELECT = {
  id: true,
  localDate: true,
  startedAt: true,
  endedAt: true,
  title: true,
  notes: true,
  sessionRpe: true,
  routineId: true,
  _count: { select: { exercises: true } },
} as const satisfies Prisma.WorkoutSessionSelect;

export const SESSION_DETAIL_SELECT = {
  id: true,
  localDate: true,
  startedAt: true,
  endedAt: true,
  title: true,
  notes: true,
  sessionRpe: true,
  routineId: true,
  exercises: {
    orderBy: { position: 'asc' },
    select: WORKOUT_EXERCISE_SELECT,
  },
} as const satisfies Prisma.WorkoutSessionSelect;

type SelectedSet = Prisma.WorkoutSetGetPayload<{ select: typeof SET_SELECT }>;
type SelectedWorkoutExercise = Prisma.WorkoutExerciseGetPayload<{
  select: typeof WORKOUT_EXERCISE_SELECT;
}>;
type SelectedSessionListRow = Prisma.WorkoutSessionGetPayload<{
  select: typeof SESSION_LIST_SELECT;
}>;
type SelectedSessionDetail = Prisma.WorkoutSessionGetPayload<{
  select: typeof SESSION_DETAIL_SELECT;
}>;

export function toSetRow(set: SelectedSet): WorkoutSetRow {
  return {
    id: set.id,
    position: set.position,
    reps: set.reps,
    weightKg: decimalToNumber(set.weightKg),
    rpe: decimalToNumber(set.rpe),
    durationSec: set.durationSec,
    isWarmup: set.isWarmup,
    completedAt: set.completedAt?.toISOString() ?? null,
  };
}

export function toWorkoutExerciseRow(
  row: SelectedWorkoutExercise
): WorkoutExerciseRow {
  return {
    id: row.id,
    position: row.position,
    notes: row.notes,
    exerciseId: row.exerciseId,
    exerciseName: row.exercise.name,
    primaryMuscle: row.exercise.primaryMuscle,
    equipment: row.exercise.equipment,
    metric: row.exercise.metric,
    sets: row.sets.map(toSetRow),
  };
}

export function toSessionRow(
  session: SelectedSessionListRow
): WorkoutSessionRow {
  return {
    id: session.id,
    // `localDateKey`, not `toISOString()`: the column is a Postgres `DATE`
    // handed back as UTC midnight, and the day is the whole meaning of it.
    localDate: localDateKey(session.localDate),
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    title: session.title,
    notes: session.notes,
    sessionRpe: decimalToNumber(session.sessionRpe),
    routineId: session.routineId,
    exerciseCount: session._count.exercises,
  };
}

export function toSessionDetail(
  session: SelectedSessionDetail
): WorkoutSessionDetail {
  return {
    id: session.id,
    localDate: localDateKey(session.localDate),
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    title: session.title,
    notes: session.notes,
    sessionRpe: decimalToNumber(session.sessionRpe),
    routineId: session.routineId,
    exercises: session.exercises.map(toWorkoutExerciseRow),
  };
}
