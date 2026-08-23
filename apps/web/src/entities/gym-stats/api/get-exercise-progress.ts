'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import {
  buildProgression,
  type NamedPerformedExercise,
  STATS_SESSION_SELECT,
  type StatsSession,
  toStatsSession,
} from './gym-stats-fields';

import { exerciseProgressSchema } from '@/entities/gym-stats/model/gym-stats-schema';
import type {
  ExerciseProgress,
  ExerciseSessionReading,
  ExerciseSetReading,
} from '@/entities/gym-stats/model/gym-stats-types';
import { requireAdmin } from '@/shared/lib/auth';
import {
  addDays,
  localDateKey,
  toLocalDate,
} from '@/shared/lib/health/local-date';
import {
  bestE1rmKg,
  E1RM_RELIABLE_MAX_REPS,
  epleyE1rm,
  personalRecords,
  volumeLoadKg,
} from '@/shared/lib/health/workout-stats';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** How many recent sessions the detail screen prints set by set. Enough to
 *  see the last month of a twice-weekly lift; the chart above it covers the
 *  rest of the window. */
const SESSION_CAP = 12;

/**
 * One exercise's own history: its e1RM series, its records, and the sets
 * behind them.
 *
 * A missing exercise is `{ success: true, data: null }`, not a failure —
 * `getWorkoutSession` documents that choice at length, and it applies for the
 * same reason here: this is awaited by a server component, where a throw
 * replaces the page with the root `error.tsx` rather than render the screen's
 * own "no longer exists" state. `findFirst` on `(id, ownerId)` rather than
 * `findUnique` on the id, so an exercise belonging to someone else is simply
 * not found.
 *
 * **Every record here is a record WITHIN THE WINDOW, and the screen says so.**
 * An all-time best would need an unbounded scan of the session tree, which
 * every read in this module is written to avoid; a bounded window plus an
 * explicit label is honest, where an unlabelled "best" over the last year
 * quietly claims to be a lifetime figure.
 *
 * The two reads run in parallel because neither depends on the other: the
 * catalogue row supplies the identity and the metric, the session rows supply
 * the training, and an exercise that has never been performed still has a
 * page.
 */
export async function getExerciseProgress(
  input: unknown
): Promise<ApiResponse<ExerciseProgress | null>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(
      exerciseProgressSchema,
      input,
      'getExerciseProgress'
    );
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { exerciseId, days, timeZone } = parsed.data;
    const to = toLocalDate(new Date(), timeZone);
    const from = addDays(to, -(days - 1));

    const [exercise, rows] = await Promise.all([
      prisma.exercise.findFirst({
        where: { id: exerciseId, ownerId: session.id },
        select: {
          id: true,
          name: true,
          primaryMuscle: true,
          secondaryMuscles: true,
          equipment: true,
          metric: true,
          isArchived: true,
        },
      }),
      prisma.workoutSession.findMany({
        where: {
          ownerId: session.id,
          localDate: { gte: from, lte: to },
          endedAt: { not: null },
          // The predicate that keeps this a per-exercise read rather than a
          // whole-history one. `idx_workout_exercises_exercise` is the index
          // the design notes call "the index every per-exercise statistic
          // goes through".
          exercises: { some: { exerciseId } },
        },
        orderBy: { localDate: 'asc' },
        select: STATS_SESSION_SELECT,
      }),
    ]);

    if (!exercise) {
      return { success: true, data: null };
    }

    const sessions = rows.map(toStatsSession);
    const records = personalRecords(sessions, exerciseId);

    return {
      success: true,
      data: {
        exerciseId: exercise.id,
        name: exercise.name,
        primaryMuscle: exercise.primaryMuscle,
        secondaryMuscles: exercise.secondaryMuscles,
        equipment: exercise.equipment,
        metric: exercise.metric,
        isArchived: exercise.isArchived,
        from: localDateKey(from),
        to: localDateKey(to),
        days,
        progression: buildProgression(sessions, exerciseId, {
          name: exercise.name,
          primaryMuscle: exercise.primaryMuscle,
          metric: exercise.metric,
        }),
        heaviest: records.heaviest
          ? {
              weightKg: records.heaviest.weightKg,
              reps: records.heaviest.reps,
              localDate: localDateKey(records.heaviest.localDate),
            }
          : null,
        bestE1rm: records.bestE1rm
          ? {
              valueKg: records.bestE1rm.valueKg,
              weightKg: records.bestE1rm.weightKg,
              reps: records.bestE1rm.reps,
              localDate: localDateKey(records.bestE1rm.localDate),
            }
          : null,
        // Newest first: a detail screen is read as "what did I last do", the
        // same direction `getWorkoutSessions` orders its history in, while the
        // chart above runs left to right in time.
        sessions: [...sessions]
          .reverse()
          .slice(0, SESSION_CAP)
          .map((item) => toSessionReading(item, exerciseId)),
        sessionCap: SESSION_CAP,
        e1rmReliableMaxReps: E1RM_RELIABLE_MAX_REPS,
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(
      error,
      'Failed to load the exercise history'
    );
    logger.error(`Get exercise progress error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}

/**
 * One session, reduced to what this exercise did in it.
 *
 * Warm-ups are KEPT in the printed list and marked, where every statistic
 * excludes them. The list is a record of what was performed, and a warm-up
 * that vanished from it would look like a set that was never logged — the
 * exclusion is a rule about the numbers, not about the history.
 */
function toSessionReading(
  session: StatsSession,
  exerciseId: string
): ExerciseSessionReading {
  const performed = session.exercises.filter(
    (exercise) => exercise.exerciseId === exerciseId
  );

  const best = performed.reduce<number | null>((found, exercise) => {
    const value = bestE1rmKg(exercise);
    if (value === null) return found;
    return found === null || value > found ? value : found;
  }, null);

  return {
    sessionId: session.id,
    localDate: localDateKey(session.localDate),
    title: session.title,
    sets: performed.flatMap(toSetReadings),
    volumeLoadKg: volumeLoadKg(performed),
    bestE1rmKg: best,
  };
}

/**
 * Every set, with the estimate it produces and whether that estimate is
 * trustworthy.
 *
 * `epleyE1rm` is called directly rather than `bestE1rmKg`, because this is the
 * one place the UNRELIABLE estimates have to survive: `bestE1rmKg` drops them,
 * and a set of twenty that disappeared from its own session's list would read
 * as a set that was never logged. It is carried with the flag the formula
 * itself sets, and the screen renders it visibly distinguished — it can never
 * establish a record, which `personalRecords` enforces independently.
 *
 * Estimates are attached on every metric, not only `weight_reps`: a
 * `weighted_bodyweight` set records kilos that are a supplement to an unseen
 * body mass, so the number would be wrong. Guarded here rather than trusted to
 * the caller.
 */
function toSetReadings(exercise: NamedPerformedExercise): ExerciseSetReading[] {
  return exercise.sets.map((set) => {
    const estimate =
      exercise.metric === 'weight_reps'
        ? epleyE1rm(set.weightKg, set.reps)
        : null;

    return {
      reps: set.reps,
      weightKg: set.weightKg,
      rpe: set.rpe,
      durationSec: set.durationSec,
      isWarmup: set.isWarmup,
      e1rmKg: estimate?.valueKg ?? null,
      e1rmUnreliable: estimate?.unreliable ?? false,
    };
  });
}
