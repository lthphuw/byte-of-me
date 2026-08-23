'use server';

import { type Prisma, prisma } from '@byte-of-me/db';
import {
  type Metric,
  METRICS,
  type Muscle,
  MUSCLES,
} from '@byte-of-me/db/gym-vocabulary';
import { logger } from '@byte-of-me/logger';

import { sleepTrainingCorrelationSchema } from '@/entities/health-insight/model/health-insight-schema';
import type {
  SleepTrainingCorrelation,
  SleepTrainingPoint,
} from '@/entities/health-insight/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { decimalToNumber } from '@/shared/lib/decimal';
import {
  CORRELATION_MIN_PAIRS,
  joinSleepWithTraining,
  sessionTrainingOutput,
  sleepTrainingCorrelations,
  type TrainingDayOutput,
} from '@/shared/lib/health/correlation';
import {
  addDays,
  localDateKey,
  toLocalDate,
} from '@/shared/lib/health/local-date';
import { computeNight } from '@/shared/lib/health/sleep-stats';
import type { PerformedExercise } from '@/shared/lib/health/workout-stats';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * The narrowest select that can produce a volume load and a mean RPE.
 *
 * Private to this file rather than reused from `workout/api/workout-fields.ts`
 * — that shape carries positions, notes, timestamps and the catalogue's
 * display fields for the logging screen, none of which a correlation reads,
 * and it is deliberately not exported from that slice's barrel either. A
 * `satisfies` clause rather than a hand-written row type keeps the mapper
 * below free of assertions.
 */
const CORRELATION_SESSION_SELECT = {
  localDate: true,
  exercises: {
    select: {
      exerciseId: true,
      // `metric` decides which volume formula applies at all. The muscles are
      // carried because `PerformedExercise` is one type across the whole
      // statistics module; tonnage never consults them.
      exercise: {
        select: { metric: true, primaryMuscle: true, secondaryMuscles: true },
      },
      sets: {
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

type SelectedSession = Prisma.WorkoutSessionGetPayload<{
  select: typeof CORRELATION_SESSION_SELECT;
}>;

/**
 * Does sleep predict training output?
 *
 * The join is the whole feature and it is one equality on `local_date`: a
 * sleep is stored against the day it ENDED, a workout against the day it
 * STARTED, so the night before a session on day D is the sleep row whose
 * `localDate` IS D. That asymmetry was chosen at write time
 * (`shared/lib/health/local-date.ts`) precisely so phase 3 would not need a
 * migration. The pairing itself lives in `correlation.ts`, with a test that
 * fails under the off-by-one; this action only feeds it.
 *
 * Both windows are read separately rather than joined in SQL. Prisma has no
 * cross-model join to express this, and the two tables are a few hundred rows
 * each over a year — pairing them in memory is cheaper than the raw SQL would
 * be to maintain, and it keeps the rule in a tested pure function rather than
 * in a query string.
 *
 * The statistics are computed HERE and never on the client: the maths module
 * would otherwise land in the browser bundle. `minPairs` travels in the
 * payload for the same reason — a screen can say "7 of 20 paired days"
 * without importing the constant.
 *
 * **An insufficient history must produce a usable object, not an exception.**
 * This is awaited by a server component, where a throw escapes the RSC and
 * replaces the whole page with the root `error.tsx` instead of the in-place
 * message the screen already renders — `getSpaceStats` documents that trap at
 * length. Every coefficient is independently nullable and the three day counts
 * always come back, so "not enough data yet" is a rendered state rather than
 * an error.
 */
export async function getSleepTrainingCorrelation(
  input: unknown
): Promise<ApiResponse<SleepTrainingCorrelation>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(
      sleepTrainingCorrelationSchema,
      input,
      'getSleepTrainingCorrelation'
    );
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { days, timeZone } = parsed.data;
    const to = toLocalDate(new Date(), timeZone);
    const from = addDays(to, -(days - 1));
    const window = { gte: from, lte: to };

    const [sleepRows, sessionRows] = await Promise.all([
      prisma.sleepLog.findMany({
        where: { ownerId: session.id, localDate: window },
        orderBy: { localDate: 'asc' },
        // Narrow: `computeNight` reads exactly these five columns, and the
        // note body this read does not want is the bulk of the row.
        select: {
          localDate: true,
          bedAt: true,
          wakeAt: true,
          latencyMin: true,
          awakeningsMin: true,
        },
      }),
      prisma.workoutSession.findMany({
        where: {
          ownerId: session.id,
          localDate: window,
          // FINISHED sessions only. A session still being logged has a tonnage
          // that is still being written, and letting today's half-entered
          // workout into the correlation would score an ordinary day as a
          // light one for as long as it stays open.
          endedAt: { not: null },
        },
        orderBy: { localDate: 'asc' },
        select: CORRELATION_SESSION_SELECT,
      }),
    ]);

    const nights = sleepRows.map(computeNight);

    const outputs: TrainingDayOutput[] = sessionRows.map(toTrainingDayOutput);

    const join = joinSleepWithTraining(nights, outputs);
    const correlations = sleepTrainingCorrelations(join);

    const points: SleepTrainingPoint[] = join.days.map((day) => ({
      // `localDateKey`, not `toISOString()`: the column is a Postgres `DATE`
      // handed back as UTC midnight, and the day is the whole meaning of it.
      localDate: localDateKey(day.localDate),
      totalSleepMin: day.totalSleepMin,
      volumeLoadKg: day.volumeLoadKg,
      meanRpe: day.meanRpe,
      trained: day.trained,
    }));

    return {
      success: true,
      data: {
        from: localDateKey(from),
        to: localDateKey(to),
        volumeLoad: correlations.volumeLoad,
        meanRpe: correlations.meanRpe,
        trained: correlations.trained,
        minPairs: CORRELATION_MIN_PAIRS,
        pairedDays: join.pairedDays,
        sleepOnlyDays: join.sleepOnlyDays,
        sessionOnlyDays: join.sessionOnlyDays,
        points,
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(
      error,
      'Failed to load the sleep and training correlation'
    );
    logger.error(`Get sleep training correlation error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}

const isMetric = (value: string): value is Metric =>
  (METRICS as readonly string[]).includes(value);

const isMuscle = (value: string): value is Muscle =>
  (MUSCLES as readonly string[]).includes(value);

/** One session reduced to the day's output. `sessionRpe` and the duration are
 *  not selected: Foster's session-RPE is what `sessionLoad` and ACWR are built
 *  on, and this measure asks a different question of the working sets. */
function toTrainingDayOutput(row: SelectedSession): TrainingDayOutput {
  return sessionTrainingOutput({
    localDate: row.localDate,
    sessionRpe: null,
    durationMin: null,
    exercises: row.exercises.flatMap(toPerformedExercise),
  });
}

/**
 * A logged exercise as the statistics module consumes it, or `[]`.
 *
 * The vocabulary columns are plain `String` in Postgres, validated with
 * `z.enum` on write (`entities/exercise/model/exercise-schema.ts`), so an
 * out-of-vocabulary value cannot arrive through the app at all. It is still
 * filtered rather than cast, and the exercise is DROPPED rather than
 * defaulted: a wrong `metric` selects the wrong volume formula and so produces
 * a wrong NUMBER rather than a visible error — the schema's own comment makes
 * that point — and a hand-edited row that cannot be typed has no trustworthy
 * tonnage to contribute.
 *
 * `flatMap` over `filter` + `map` because it narrows without a type assertion.
 */
function toPerformedExercise(
  row: SelectedSession['exercises'][number]
): PerformedExercise[] {
  const { metric, primaryMuscle, secondaryMuscles } = row.exercise;
  if (!isMetric(metric) || !isMuscle(primaryMuscle)) return [];

  return [
    {
      exerciseId: row.exerciseId,
      metric,
      primaryMuscle,
      secondaryMuscles: secondaryMuscles.filter(isMuscle),
      sets: row.sets.map((set) => ({
        reps: set.reps,
        // `Decimal` -> `number`. Left alone it would be NaN inside the tonnage
        // sum long before the action boundary — a `Decimal` is an object whose
        // digits live in internal fields (`shared/lib/decimal.ts`).
        weightKg: decimalToNumber(set.weightKg),
        rpe: decimalToNumber(set.rpe),
        durationSec: set.durationSec,
        isWarmup: set.isWarmup,
      })),
    },
  ];
}
