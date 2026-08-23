import {
  type Metric,
  METRICS,
  type Muscle,
  MUSCLES,
} from '@byte-of-me/db/gym-vocabulary';

import type {
  WorkoutExerciseRow,
  WorkoutSessionDetail,
} from '@/entities/workout';
import {
  bestE1rmKg,
  type PerformedExercise,
  type VolumeBreakdown,
  volumeBreakdown,
  workingSets,
} from '@/shared/lib/health/workout-stats';

/**
 * What the finish sheet reports back about the session just logged.
 *
 * Everything here is computed from THIS session's own rows, with no second
 * read: the sheet opens on the gym floor, at the end of a workout, on whatever
 * signal is left in the building, and a summary that has to fetch before it can
 * print is a summary that shows a spinner at the one moment nobody is willing
 * to wait.
 *
 * **There is deliberately no "new personal record" line.** A PR is a claim
 * about the whole history, and the only history read this slice has
 * (`getWorkoutSessions`) returns session rows WITHOUT their sets — the figure
 * cannot be computed here without a new server read, and inventing one from
 * the current session alone would report every first set of a new exercise as a
 * record. `bestSets` reports what this session actually did instead, which is
 * true; `shared/lib/health/workout-stats.ts` already holds `personalRecords`
 * for whenever a history read that carries sets exists to feed it.
 */
export interface SessionSummary {
  /** Sets that count toward volume — warm-ups excluded, per `workout-stats`. */
  workingSetCount: number;
  /** Every set logged, warm-ups included. The two differ, and a reader who
   *  did six warm-up singles deserves to see why the counts disagree. */
  totalSetCount: number;
  /** Exercises with at least one set on them. An exercise added and never
   *  performed is not part of the workout that happened. */
  performedExerciseCount: number;
  volume: VolumeBreakdown;
  bestSets: BestSet[];
}

/** The top working set of one exercise in this session. */
export interface BestSet {
  workoutExerciseId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  /** Epley, and null when the set is outside the range the estimate holds in
   *  — `bestE1rmKg` refuses above twelve reps rather than printing a number
   *  that diverges upward from anything liftable. */
  e1rmKg: number | null;
}

const isMetric = (value: string): value is Metric =>
  (METRICS as readonly string[]).includes(value);

const isMuscle = (value: string): value is Muscle =>
  (MUSCLES as readonly string[]).includes(value);

/**
 * A logged exercise as the statistics module consumes it, or `[]`.
 *
 * Filtered rather than cast, and DROPPED rather than defaulted, for the reason
 * `get-sleep-training-correlation.ts` gives at the identical boundary: the
 * vocabulary columns are plain `String` in Postgres, and a wrong `metric`
 * selects the wrong volume formula — producing a wrong NUMBER instead of a
 * visible error. `flatMap` over `filter` + `map` because it narrows without a
 * type assertion.
 *
 * `secondaryMuscles` is empty because `WorkoutExerciseRow` does not carry them
 * — the session read selects three display fields off the catalogue entry, not
 * the whole row. Nothing in this file counts sets per muscle, so the gap costs
 * nothing here; a caller that needs muscle exposure has to read the catalogue.
 */
function toPerformedExercise(row: WorkoutExerciseRow): PerformedExercise[] {
  if (!isMetric(row.metric) || !isMuscle(row.primaryMuscle)) return [];

  return [
    {
      exerciseId: row.exerciseId,
      metric: row.metric,
      primaryMuscle: row.primaryMuscle,
      secondaryMuscles: [],
      sets: row.sets.map((set) => ({
        reps: set.reps,
        weightKg: set.weightKg,
        rpe: set.rpe,
        durationSec: set.durationSec,
        isWarmup: set.isWarmup,
      })),
    },
  ];
}

/**
 * The session, summed.
 *
 * Volume comes from `volumeBreakdown` rather than a tonnage sum written here,
 * because that function owns the rule this module must not restate: warm-ups
 * are excluded, and each metric contributes in its own unit — tonnage,
 * bodyweight reps and seconds are not addable and are kept apart.
 */
export function summariseSession(
  session: WorkoutSessionDetail
): SessionSummary {
  const performed = session.exercises.flatMap(toPerformedExercise);

  return {
    workingSetCount: performed.reduce(
      (total, exercise) => total + workingSets(exercise).length,
      0
    ),
    totalSetCount: session.exercises.reduce(
      (total, exercise) => total + exercise.sets.length,
      0
    ),
    performedExerciseCount: session.exercises.filter(
      (exercise) => exercise.sets.length > 0
    ).length,
    volume: volumeBreakdown(performed),
    bestSets: session.exercises.flatMap(toBestSet),
  };
}

/**
 * The heaviest working set of one exercise, or `[]`.
 *
 * `weight_reps` only. A `weighted_bodyweight` set carries an unknown fraction
 * of body mass on top of the belt plate, so "heaviest" would be comparing two
 * numbers that measure different things — the same reason `bestE1rmKg` refuses
 * that metric.
 *
 * Ties on weight go to the set with MORE reps, which is the ordering
 * `personalRecords` uses for the same comparison: 5 × 100 kg is a better top
 * set than 3 × 100 kg, and reporting the first one logged would make the line
 * depend on entry order.
 */
function toBestSet(row: WorkoutExerciseRow): BestSet[] {
  const [performed] = toPerformedExercise(row);
  if (!performed || performed.metric !== 'weight_reps') return [];

  let best: { weightKg: number; reps: number } | null = null;

  for (const set of workingSets(performed)) {
    const { weightKg, reps } = set;
    if (weightKg === null || reps === null) continue;
    if (weightKg <= 0 || reps <= 0) continue;

    if (
      best === null ||
      weightKg > best.weightKg ||
      (weightKg === best.weightKg && reps > best.reps)
    ) {
      best = { weightKg, reps };
    }
  }

  if (!best) return [];

  return [
    {
      workoutExerciseId: row.id,
      exerciseName: row.exerciseName,
      weightKg: best.weightKg,
      reps: best.reps,
      e1rmKg: bestE1rmKg(performed),
    },
  ];
}
