import type { Prisma } from '@byte-of-me/db';
import {
  type Metric,
  METRICS,
  type Muscle,
  MUSCLES,
} from '@byte-of-me/db/gym-vocabulary';

import type {
  E1rmSeriesPoint,
  ExerciseProgression,
} from '@/entities/health-insight/model/gym-stats-types';
import { decimalToNumber } from '@/shared/lib/decimal';
import { localDateKey } from '@/shared/lib/health/local-date';
import {
  bestE1rmKg,
  type E1rmPoint,
  e1rmSeries,
  epleyE1rm,
  OVERLOAD_MIN_SESSIONS,
  overloadSlopeKgPerSession,
  type PerformedExercise,
  workingSets,
  type WorkoutSessionInput,
} from '@/shared/lib/health/workout-stats';

/**
 * The select and the mappers the two gym statistics reads share.
 *
 * Deliberately NOT a `'use server'` module — it exports plain objects and
 * synchronous functions, which a server-action file may not — and deliberately
 * absent from `api/index.ts`, since nothing outside this directory should
 * reach a Prisma select shape. The same arrangement `workout-fields.ts` uses
 * in the workout slice.
 *
 * It is a THIRD select over the session tree, beside that slice's
 * `SESSION_DETAIL_SELECT` and the correlation's private one, and that is
 * deliberate. The logging screen's shape carries positions, notes, timestamps
 * and the catalogue's equipment field that a statistic never reads, and the
 * correlation's carries neither `sessionRpe` nor a finish time, which is
 * exactly what Foster's load and ACWR are built on. Widening either to serve
 * this would make a logging screen pay for statistics it never draws.
 */

export const STATS_SESSION_SELECT = {
  id: true,
  localDate: true,
  startedAt: true,
  endedAt: true,
  title: true,
  sessionRpe: true,
  exercises: {
    orderBy: { position: 'asc' },
    select: {
      exerciseId: true,
      // `metric` decides which volume formula applies at all; the muscles are
      // what makes hard sets per muscle computable; the name is what a
      // progression row is labelled with.
      exercise: {
        select: {
          name: true,
          metric: true,
          primaryMuscle: true,
          secondaryMuscles: true,
        },
      },
      sets: {
        orderBy: { position: 'asc' },
        select: {
          reps: true,
          weightKg: true,
          rpe: true,
          durationSec: true,
          isWarmup: true,
        },
      },
    },
  },
} as const satisfies Prisma.WorkoutSessionSelect;

export type SelectedStatsSession = Prisma.WorkoutSessionGetPayload<{
  select: typeof STATS_SESSION_SELECT;
}>;

/** A performed exercise plus the one display field the statistics screens
 *  label it with. Structurally still a `PerformedExercise`, so every function
 *  in `workout-stats.ts` takes it unchanged. */
export interface NamedPerformedExercise extends PerformedExercise {
  name: string;
}

/**
 * A session as the statistics consume it, with the identity a screen needs to
 * link back to it.
 *
 * `durationMin` is DERIVED, not stored: the schema has no duration column
 * because `endedAt − startedAt` already answers it, and deriving it here is
 * what lets `sessionLoad` refuse an unfinished session rather than treat it as
 * a zero-minute one.
 */
export interface StatsSession extends WorkoutSessionInput {
  id: string;
  title: string;
  exercises: NamedPerformedExercise[];
}

const isMetric = (value: string): value is Metric =>
  (METRICS as readonly string[]).includes(value);

const isMuscle = (value: string): value is Muscle =>
  (MUSCLES as readonly string[]).includes(value);

export function toStatsSession(row: SelectedStatsSession): StatsSession {
  return {
    id: row.id,
    title: row.title,
    localDate: row.localDate,
    sessionRpe: decimalToNumber(row.sessionRpe),
    durationMin: durationMin(row.startedAt, row.endedAt),
    exercises: row.exercises.flatMap(toNamedPerformedExercise),
  };
}

/**
 * Whole minutes between the two timestamps, or null.
 *
 * Null on an unfinished session and null on a negative span — a clock that
 * ran backwards is corrupt input, and Foster's load multiplied by a negative
 * duration would subtract from the very sums ACWR divides.
 */
function durationMin(startedAt: Date, endedAt: Date | null): number | null {
  if (endedAt === null) return null;

  const minutes = Math.round(
    (endedAt.getTime() - startedAt.getTime()) / 60_000
  );

  return minutes < 0 ? null : minutes;
}

/**
 * A logged exercise as the statistics module consumes it, or `[]`.
 *
 * The vocabulary columns are plain `String` in Postgres, validated with
 * `z.enum` on write, so an out-of-vocabulary value cannot arrive through the
 * app. It is still filtered rather than cast, and the exercise is DROPPED
 * rather than defaulted: a wrong `metric` selects the wrong volume formula and
 * so produces a wrong NUMBER rather than a visible error. `flatMap` over
 * `filter` + `map` because it narrows without a type assertion — the same
 * shape `get-sleep-training-correlation.ts` uses.
 */
function toNamedPerformedExercise(
  row: SelectedStatsSession['exercises'][number]
): NamedPerformedExercise[] {
  const { name, metric, primaryMuscle, secondaryMuscles } = row.exercise;
  if (!isMetric(metric) || !isMuscle(primaryMuscle)) return [];

  return [
    {
      exerciseId: row.exerciseId,
      name,
      metric,
      primaryMuscle,
      secondaryMuscles: secondaryMuscles.filter(isMuscle),
      sets: row.sets.map((set) => ({
        reps: set.reps,
        // `Decimal` -> `number`. Left alone it would be NaN inside the tonnage
        // sum long before the action boundary.
        weightKg: decimalToNumber(set.weightKg),
        rpe: decimalToNumber(set.rpe),
        durationSec: set.durationSec,
        isWarmup: set.isWarmup,
      })),
    },
  ];
}

/**
 * The e1RM series with a running-maximum flag on each point.
 *
 * The staircase, not the single best `personalRecords` reports: a chart wants
 * every time the number went past everything before it. It is a presentation
 * fact rather than a statistic — which is why it lives at the read boundary
 * and not in `workout-stats.ts` — and it is honest only when the window it
 * ran over is stated beside it, because the FIRST point of any window
 * trivially satisfies a running maximum.
 *
 * The input is `e1rmSeries`, which already drops every estimate above the
 * reliable rep ceiling, so an unreliable estimate cannot be marked a record
 * here by construction rather than by a second check that could drift.
 *
 * **One point per DAY, not per session.** `e1rmSeries` emits one point per
 * session, and two sessions on one day — a morning and an evening run at the
 * same lift — give two points sharing a date. The chart's x axis is a
 * calendar day and a day is what its marks are labelled and keyed with, so the
 * two would collide: the same label twice in the accessible table, and two
 * React children under one key. The day keeps the better of them, which is the
 * same rule `joinSleepWithTraining` applies when it folds two sessions onto
 * one night. The regression above is deliberately per SESSION and reads its
 * own series, so this does not change the slope.
 */
export function toE1rmSeriesPoints(series: E1rmPoint[]): E1rmSeriesPoint[] {
  const bestPerDay = new Map<string, number>();

  for (const point of series) {
    const key = localDateKey(point.localDate);
    const existing = bestPerDay.get(key);
    if (existing === undefined || point.e1rmKg > existing) {
      bestPerDay.set(key, point.e1rmKg);
    }
  }

  // `e1rmSeries` is already sorted oldest first and a `Map` keeps insertion
  // order, so the days come out in order without a second sort.
  let best: number | null = null;

  return [...bestPerDay.entries()].map(([localDate, e1rmKg]) => {
    const isRecord = best === null || e1rmKg > best;
    if (isRecord) best = e1rmKg;

    return { localDate, e1rmKg, isRecord };
  });
}

/**
 * How many recent sessions the overload slope is fitted over.
 *
 * `overloadSlopeKgPerSession`'s own default, passed explicitly so that the
 * count this file reports beside a null slope is provably the same window the
 * regression used rather than a second number that could drift from it.
 */
export const SLOPE_WINDOW_SESSIONS = 8;

/** One exercise's progression, assembled from the tested statistics rather
 *  than from a second pass over the sets. */
export function buildProgression(
  sessions: StatsSession[],
  exerciseId: string,
  meta: { name: string; primaryMuscle: string; metric: string }
): ExerciseProgression {
  const points = toE1rmSeriesPoints(e1rmSeries(sessions, exerciseId));

  let sessionCount = 0;
  let unreliableOnlySessions = 0;

  for (const session of sessions) {
    const performed = session.exercises.filter(
      (exercise) => exercise.exerciseId === exerciseId
    );
    if (performed.length === 0) continue;

    sessionCount += 1;

    // Trained, but every estimate it produced came from a set above the
    // reliable rep ceiling, so nothing was plotted. A bare gap in the chart
    // would say "you did not train it", which is a different claim.
    const reliable = performed.some(
      (exercise) => bestE1rmKg(exercise) !== null
    );
    if (reliable) continue;

    const anyEstimate = performed.some((exercise) =>
      workingSets(exercise).some(
        (set) => epleyE1rm(set.weightKg, set.reps) !== null
      )
    );
    if (anyEstimate) unreliableOnlySessions += 1;
  }

  const best = points.reduce<E1rmSeriesPoint | null>(
    (found, point) =>
      found === null || point.e1rmKg > found.e1rmKg ? point : found,
    null
  );

  return {
    exerciseId,
    name: meta.name,
    primaryMuscle: meta.primaryMuscle,
    metric: meta.metric,
    sessionCount,
    points,
    unreliableOnlySessions,
    slopeKgPerSession: overloadSlopeKgPerSession(
      sessions,
      exerciseId,
      SLOPE_WINDOW_SESSIONS
    ),
    minSlopeSessions: OVERLOAD_MIN_SESSIONS,
    slopeSessions: Math.min(points.length, SLOPE_WINDOW_SESSIONS),
    bestE1rmKg: best?.e1rmKg ?? null,
    bestE1rmDate: best?.localDate ?? null,
  };
}
