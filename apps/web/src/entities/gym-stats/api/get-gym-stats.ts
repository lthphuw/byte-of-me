'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import {
  buildProgression,
  STATS_SESSION_SELECT,
  type StatsSession,
  toStatsSession,
} from './gym-stats-fields';

import { gymStatsSchema } from '@/entities/gym-stats/model/gym-stats-schema';
import type {
  ExerciseProgression,
  GymStats,
  GymWeekBucket,
  MuscleHardSets,
} from '@/entities/gym-stats/model/gym-stats-types';
import { requireAdmin } from '@/shared/lib/auth';
import {
  addDays,
  localDateKey,
  toLocalDate,
} from '@/shared/lib/health/local-date';
import {
  acwr,
  ACWR_ACUTE_DAYS,
  ACWR_CHRONIC_DAYS,
  ACWR_MIN_CHRONIC_SESSIONS,
  E1RM_RELIABLE_MAX_REPS,
  SECONDARY_MUSCLE_SET_CREDIT,
  sessionsInWindow,
  volumeLoadKg,
  weeklyHardSetsByMuscle,
  windowLoad,
} from '@/shared/lib/health/workout-stats';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

const WEEK_DAYS = 7;

/**
 * Schoenfeld's commonly cited hypertrophy range, in hard sets per muscle per
 * week.
 *
 * A BAND, drawn behind the bars, and never a pass/fail line. The literature it
 * comes from is a dose-response relationship across trained populations, not a
 * prescription for one lifter in one week, and the count it is compared
 * against uses this project's own secondary-muscle convention
 * (`SECONDARY_MUSCLE_SET_CREDIT`) rather than whatever the studies counted.
 * Two figures that were not measured the same way can be shown together only
 * if the screen says so, which is why both numbers travel in the payload
 * beside the credit that produced the bars.
 *
 * Not in `workout-stats.ts` because it is not part of any computation there —
 * nothing in the module is gated on it, and no measure returns null because of
 * it. It is a reference range a chart draws.
 */
const HYPERTROPHY_SETS_LOW = 10;
const HYPERTROPHY_SETS_HIGH = 20;

/** How many exercises get a progression chart on the summary screen. Beyond
 *  four the page is a wall of near-identical charts and the per-exercise
 *  detail screen is the better surface; the count of the rest is reported so
 *  nothing is silently dropped. */
const PROGRESSION_LIMIT = 4;

/**
 * Everything the gym statistics screen draws, from one read of the session
 * tree.
 *
 * **Finished sessions only**: a session still being logged has a tonnage that
 * is still being written, and Foster's load needs a finish time to have a
 * duration at all. Letting today's half-entered workout in would score an
 * ordinary day as a light one for as long as it stays open, and would do it to
 * the acute half of a ratio whose whole job is to compare this week against
 * the month behind it.
 *
 * One query, then every figure comes out of `shared/lib/health/workout-stats.ts`.
 * Nothing is recomputed here — warm-up exclusion is the single most important
 * correctness rule in that module, and a private second tonnage sum is exactly
 * how the tested version and the shipped version drift apart. The only thing
 * this file derives is the running-record flag on an e1RM point, which is a
 * presentation fact rather than a statistic (`gym-stats-fields.ts`).
 *
 * **An empty history must produce a usable object, not an exception.** This is
 * awaited by a server component, where a throw escapes the RSC and replaces
 * the whole page — navigation included — with the root `error.tsx` instead of
 * the in-place "nothing logged yet" the screen already renders. Every measure
 * is independently nullable and every threshold it is gated on travels in the
 * payload, so "not enough data yet" is a rendered state with a specific
 * sentence rather than an error.
 */
export async function getGymStats(
  input: unknown
): Promise<ApiResponse<GymStats>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(gymStatsSchema, input, 'getGymStats');
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { days, timeZone } = parsed.data;
    const to = toLocalDate(new Date(), timeZone);
    const from = addDays(to, -(days - 1));

    const rows = await prisma.workoutSession.findMany({
      where: {
        ownerId: session.id,
        localDate: { gte: from, lte: to },
        endedAt: { not: null },
      },
      orderBy: { localDate: 'asc' },
      select: STATS_SESSION_SELECT,
    });

    const sessions = rows.map(toStatsSession);

    const hardSetsByMuscle = weeklyHardSetsByMuscle(sessions, to, WEEK_DAYS);
    const hardSets: MuscleHardSets[] = Object.entries(hardSetsByMuscle)
      .map(([muscle, sets]) => ({ muscle, sets }))
      .sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle));

    const acute = windowLoad(sessions, to, ACWR_ACUTE_DAYS);
    const chronic = windowLoad(sessions, to, ACWR_CHRONIC_DAYS);

    const progressions = buildProgressions(sessions);

    return {
      success: true,
      data: {
        from: localDateKey(from),
        to: localDateKey(to),
        days,
        finishedSessions: sessions.length,
        weeks: buildWeeks(sessions, to, days),
        hardSetsWindowDays: WEEK_DAYS,
        hardSets,
        secondaryCredit: SECONDARY_MUSCLE_SET_CREDIT,
        hypertrophyBandLow: HYPERTROPHY_SETS_LOW,
        hypertrophyBandHigh: HYPERTROPHY_SETS_HIGH,
        acwr: {
          ratio: acwr(sessions, to),
          acuteDays: ACWR_ACUTE_DAYS,
          chronicDays: ACWR_CHRONIC_DAYS,
          acuteLoad: acute.load,
          acuteKnown: acute.known,
          acuteUnknown: acute.unknown,
          chronicLoad: chronic.load,
          chronicKnown: chronic.known,
          chronicUnknown: chronic.unknown,
          minChronicSessions: ACWR_MIN_CHRONIC_SESSIONS,
        },
        e1rmReliableMaxReps: E1RM_RELIABLE_MAX_REPS,
        progressions: progressions.slice(0, PROGRESSION_LIMIT),
        progressionTotal: progressions.length,
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load gym statistics');
    logger.error(`Get gym stats error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}

/**
 * Trailing seven-day buckets, oldest first, each ending on a day that is a
 * whole number of weeks before the window's last day.
 *
 * Anchored on the END of the window rather than on a calendar Monday: the
 * acute half of ACWR is the last seven days whatever weekday today is, and a
 * bar chart whose newest bucket meant something different from the ratio
 * printed above it would be the same number twice with two answers. The
 * oldest bucket may extend past `from`; it is clipped by the query, so it can
 * be short, and the screen labels buckets by their end day.
 */
function buildWeeks(
  sessions: StatsSession[],
  to: Date,
  days: number
): GymWeekBucket[] {
  const buckets: GymWeekBucket[] = [];
  const count = Math.ceil(days / WEEK_DAYS);

  for (let index = count - 1; index >= 0; index -= 1) {
    const weekEnd = addDays(to, -index * WEEK_DAYS);
    const inWeek = sessionsInWindow(sessions, weekEnd, WEEK_DAYS);
    const load = windowLoad(sessions, weekEnd, WEEK_DAYS);

    buckets.push({
      weekEnd: localDateKey(weekEnd),
      volumeLoadKg: inWeek.reduce(
        (sum, item) => sum + volumeLoadKg(item.exercises),
        0
      ),
      sessions: inWeek.length,
      // Null, not 0, when nothing in the bucket had a computable load: a week
      // of sessions nobody rated is not a week of effortless training, and a
      // zero bar would read as exactly that.
      load: load.known === 0 ? null : load.load,
      loadKnown: load.known,
      loadUnknown: load.unknown,
    });
  }

  return buckets;
}

/**
 * A progression per `weight_reps` exercise trained in the window, most-trained
 * first.
 *
 * Only `weight_reps`: `bestE1rmKg` refuses every other metric, so a bodyweight
 * or timed exercise would produce a chart with no points and a null slope
 * whose explanation is "this measure does not apply", which is a different
 * screen state from "not enough sessions". The detail screen says that
 * sentence for one exercise; a summary listing every exercise that cannot have
 * an e1RM would say it a dozen times.
 */
function buildProgressions(sessions: StatsSession[]): ExerciseProgression[] {
  const seen = new Map<
    string,
    { name: string; primaryMuscle: string; metric: string }
  >();

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      if (exercise.metric !== 'weight_reps') continue;
      if (seen.has(exercise.exerciseId)) continue;

      seen.set(exercise.exerciseId, {
        name: exercise.name,
        primaryMuscle: exercise.primaryMuscle,
        metric: exercise.metric,
      });
    }
  }

  return [...seen.entries()]
    .map(([exerciseId, meta]) => buildProgression(sessions, exerciseId, meta))
    .sort(
      (a, b) => b.sessionCount - a.sessionCount || a.name.localeCompare(b.name)
    );
}
