'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { sleepSummarySchema } from '@/entities/sleep-log/model/sleep-log-schema';
import type { SleepSummary } from '@/entities/sleep-log/model/types';
import { getWorkspaceSettings } from '@/entities/workspace-settings/api/get-workspace-settings';
import { requireAdmin } from '@/shared/lib/auth';
import {
  type MidpointNight,
  msfsc,
  type SleepInterval,
  sleepRegularityIndex,
  socialJetlagMin,
} from '@/shared/lib/health/chronobiology';
import {
  addDays,
  localDateKey,
  toLocalDate,
} from '@/shared/lib/health/local-date';
import {
  computeNight,
  currentStreak,
  minutesStdDev,
  unwrapNearMidnight,
} from '@/shared/lib/health/sleep-stats';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

const MINUTE_MS = 60_000;

/**
 * Everything the hub and the sleep screen render, once, on the server. The
 * statistics are CALLED from `shared/lib/health/sleep-stats.ts`, never copied,
 * which also keeps that module off the client bundle.
 *
 * An empty history must produce a usable object, not an exception: a throw
 * escapes the RSC and replaces the whole page with the root `error.tsx`.
 */
export async function getSleepSummary(
  input: unknown
): Promise<ApiResponse<SleepSummary>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(sleepSummarySchema, input, 'getSleepSummary');
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { days, timeZone } = parsed.data;
    const today = toLocalDate(new Date(), timeZone);
    const from = addDays(today, -(days - 1));

    const [rows, settings] = await Promise.all([
      prisma.sleepLog.findMany({
        where: {
          ownerId: session.id,
          localDate: { gte: from, lte: today },
        },
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
        },
      }),
      getWorkspaceSettings(),
    ]);

    const nights = rows.map(computeNight);
    const targetMin = settings.sleepTargetMin;

    // Minutes past the midnight that opens each night's localDate. Wrapped
    // into [0,1440); `unwrapNearMidnight` then cuts it at 12:00 so the two
    // sides of the origin sit on one continuous scale.
    const minutesPastLocalMidnight = (instant: Date, localDate: Date) => {
      const raw = Math.round(
        (instant.getTime() - localDate.getTime()) / MINUTE_MS
      );
      return ((raw % 1440) + 1440) % 1440;
    };

    // Both clocks unwrap: `localDate` is UTC midnight, so in +07 the origin
    // is 07:00 local and a 06:50/07:10 wake pair lands on 1430 and 10 — the
    // tile read +/-622 min while the raster band beside it was right.
    const bedtimes = rows.map((r) =>
      unwrapNearMidnight(minutesPastLocalMidnight(r.bedAt, r.localDate))
    );
    const waketimes = rows.map((r) =>
      unwrapNearMidnight(minutesPastLocalMidnight(r.wakeAt, r.localDate))
    );

    // SRI wants the SIGNED offset from the wake day's midnight, not the
    // wrapped value above: onset is normally the previous evening and must
    // stay negative, or a regular sleeper scores as inverted.
    const intervals: SleepInterval[] = rows.map((r) => ({
      localDate: r.localDate,
      onsetOffsetMin:
        Math.round((r.bedAt.getTime() - r.localDate.getTime()) / MINUTE_MS) +
        (r.latencyMin ?? 0),
      wakeOffsetMin: Math.round(
        (r.wakeAt.getTime() - r.localDate.getTime()) / MINUTE_MS
      ),
    }));

    const midpoints: MidpointNight[] = rows.map((r, i) => ({
      midsleepMin: nights[i].midsleepMin,
      totalSleepMin: nights[i].totalSleepMin,
      isFreeDay: r.isFreeDay,
    }));

    return {
      success: true,
      data: {
        nights: nights.map((n) => ({
          ...n,
          localDate: localDateKey(n.localDate),
        })),
        bedtimeSdMin: minutesStdDev(bedtimes),
        waketimeSdMin: minutesStdDev(waketimes),
        streak: currentStreak(nights, today),
        targetMin,
        sri: sleepRegularityIndex(intervals),
        socialJetlagMin: socialJetlagMin(midpoints),
        msfscMin: msfsc(midpoints),
        freeDayCount: midpoints.filter((m) => m.isFreeDay).length,
        workDayCount: midpoints.filter((m) => !m.isFreeDay).length,
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load sleep summary');
    logger.error(`Get sleep summary error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
