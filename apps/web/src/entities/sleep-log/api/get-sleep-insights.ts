'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import {
  SLEEP_FACTORS,
  sleepInsightsSchema,
} from '@/entities/sleep-log/model/sleep-log-schema';
import type { SleepInsights } from '@/entities/sleep-log/model/types';
import { getWorkspaceSettings } from '@/entities/workspace-settings/api/get-workspace-settings';
import { requireAdmin } from '@/shared/lib/auth';
import {
  addDays,
  localDateKey,
  toLocalDate,
} from '@/shared/lib/health/local-date';
import {
  type InsightNight,
  moodByDuration,
  pairNightsWithMood,
  rankedContrasts,
  sleepDebt,
  weeklyReview,
} from '@/shared/lib/health/sleep-insights';
import { computeNight } from '@/shared/lib/health/sleep-stats';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * The insight panel's figures, computed once on the server.
 *
 * The maths lives in `shared/lib/health/sleep-insights.ts` and is CALLED from
 * here rather than reimplemented — same rule as `getSleepSummary`, and the
 * same reason: those functions are the tested ones.
 *
 * It reads `day_entries` directly rather than importing `@/entities/day-entry`,
 * which would be the sideways slice import AGENTS §3 rules out. Two columns
 * over a bounded window; the mood is an outcome variable here, not a journal.
 *
 * Never throws. Awaited by an RSC, where a throw replaces the whole page with
 * the root `error.tsx` — including the calendar, which needs none of this.
 */
export async function getSleepInsights(
  input: unknown
): Promise<ApiResponse<SleepInsights>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(sleepInsightsSchema, input, 'getSleepInsights');
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { days, timeZone } = parsed.data;
    const today = toLocalDate(new Date(), timeZone);
    const todayKey = localDateKey(today);
    const from = addDays(today, -(days - 1));

    const [rows, moodRows, settings] = await Promise.all([
      prisma.sleepLog.findMany({
        where: { ownerId: session.id, localDate: { gte: from, lte: today } },
        orderBy: { localDate: 'asc' },
        select: {
          localDate: true,
          bedAt: true,
          wakeAt: true,
          riseAt: true,
          latencyMin: true,
          awakeningsMin: true,
          awakeningsCount: true,
          napBucket: true,
          isFreeDay: true,
          quality: true,
          restedness: true,
          factors: true,
        },
      }),
      prisma.dayEntry.findMany({
        where: { ownerId: session.id, localDate: { gte: from, lte: today } },
        select: { localDate: true, mood: true },
      }),
      getWorkspaceSettings(),
    ]);

    const moodByDay = new Map(
      moodRows.map((row) => [localDateKey(row.localDate), row.mood])
    );

    const unpaired = rows.map((row) => {
      const night = computeNight(row);

      return {
        localDate: localDateKey(row.localDate),
        totalSleepMin: night.totalSleepMin,
        efficiencyPct: night.efficiencyPct,
        midsleepMin: night.midsleepMin,
        isFreeDay: row.isFreeDay,
        napBucket: row.napBucket,
        factors: row.factors,
        quality: row.quality,
        restedness: row.restedness,
      };
    });

    const nights: InsightNight[] = pairNightsWithMood(unpaired, moodByDay);

    return {
      success: true,
      data: {
        nightCount: nights.length,
        windowDays: days,
        contrasts: rankedContrasts(nights, SLEEP_FACTORS),
        moodByDuration: moodByDuration(nights),
        week: weeklyReview(nights, todayKey),
        debt: sleepDebt(nights, todayKey, settings.sleepTargetMin),
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load sleep insights');
    logger.error(`Get sleep insights error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
