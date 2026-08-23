/**
 * The shapes an action hands back, which are NOT the Prisma row shapes.
 *
 * Two conversions happen at the action boundary and both are load-bearing:
 * a `Date` becomes an ISO string, and a `Decimal` becomes a `number` (see
 * `shared/lib/decimal.ts`). A server action's return value is serialized, so
 * a `Date` or a `Decimal` in a return type is a lie the compiler cannot catch.
 */

/** One catalog entry, as the client receives it. */
export interface ExerciseRow {
  id: string;
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  metric: string;
  isArchived: boolean;
}

/**
 * One planned item inside a routine. Carries the exercise's own display
 * fields so a routine renders without a second round trip — the catalog is
 * small and per-owner, and the alternative is either an N+1 or a client-side
 * join against a list that may be filtered.
 */
export interface RoutineItemRow {
  id: string;
  position: number;
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: string;
  metric: string;
  targetSets: number | null;
  targetRepsLow: number | null;
  targetRepsHigh: number | null;
  /** `Decimal(3,1)` in Postgres, a plain number here. */
  targetRpe: number | null;
  restSec: number | null;
}

export interface RoutineRow {
  id: string;
  name: string;
  notes: string | null;
  position: number;
  isArchived: boolean;
  /** Ordered by `position` ascending — the order the routine is performed in,
   *  decided once here rather than re-sorted by every consumer. */
  items: RoutineItemRow[];
}
