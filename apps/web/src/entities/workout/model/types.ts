/**
 * The shapes an action hands back, which are NOT the Prisma row shapes.
 *
 * Two conversions happen at the action boundary and both are load-bearing. A
 * `Date` becomes an ISO string, because a server action's return value is
 * serialized. A `Decimal` becomes a `number`, because it does NOT serialize
 * usefully — it arrives as an object whose digits live in internal fields,
 * and every arithmetic use of it is silently `NaN` while the type still
 * claims a number (`shared/lib/decimal.ts`).
 */

/** One logged set. `weightKg` and `rpe` are `Decimal` columns in Postgres. */
export interface WorkoutSetRow {
  id: string;
  position: number;
  reps: number | null;
  weightKg: number | null;
  rpe: number | null;
  durationSec: number | null;
  isWarmup: boolean;
  completedAt: string | null;
}

/**
 * One exercise inside a session, with its sets in performing order.
 *
 * Carries the catalog entry's display fields — `metric` above all, which is
 * what tells the logging screen whether this row takes reps, weight, or a
 * duration. Without it a plank and a pull-up render the same input.
 */
export interface WorkoutExerciseRow {
  id: string;
  position: number;
  notes: string | null;
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: string;
  equipment: string;
  metric: string;
  sets: WorkoutSetRow[];
}

/** One row in the history list. `exerciseCount` comes from a `_count`, not
 *  from loading the exercises — a list of sessions never needs their sets. */
export interface WorkoutSessionRow {
  id: string;
  /** `YYYY-MM-DD`. The day the session STARTED. */
  localDate: string;
  startedAt: string;
  /** Null means in progress; there is no separate status column. */
  endedAt: string | null;
  /** A snapshot of the routine name at start time, not a live join. */
  title: string;
  notes: string | null;
  sessionRpe: number | null;
  routineId: string | null;
  exerciseCount: number;
}

/** One session opened for logging: everything above, plus the full tree. */
export interface WorkoutSessionDetail
  extends Omit<WorkoutSessionRow, 'exerciseCount'> {
  exercises: WorkoutExerciseRow[];
}
