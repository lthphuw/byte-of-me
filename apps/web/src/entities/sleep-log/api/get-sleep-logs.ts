'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { sleepRangeSchema } from '@/entities/sleep-log/model/sleep-log-schema';
import type { SleepLogRow } from '@/entities/sleep-log/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { localDateKey } from '@/shared/lib/health/local-date';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

const SELECT = {
  id: true,
  localDate: true,
  bedAt: true,
  wakeAt: true,
  latencyMin: true,
  awakeningsMin: true,
  quality: true,
  note: true,
  isFreeDay: true,
  factors: true,
} as const;

/**
 * One window of nights, oldest first.
 *
 * Bounded at BOTH ends and validated, so a caller cannot turn this into an
 * unbounded scan of the table. Ascending because every chart draws left to
 * right in time and reversing in the component would put the ordering in two
 * places.
 *
 * `uniq_sleep_logs_owner_date` serves this read directly — it leads with
 * `owner_id` and ranges on `local_date`, which is exactly this predicate.
 */
export async function getSleepLogs(
  input: unknown
): Promise<ApiResponse<SleepLogRow[]>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(sleepRangeSchema, input, 'getSleepLogs');
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const rows = await prisma.sleepLog.findMany({
      where: {
        ownerId: session.id,
        localDate: {
          gte: new Date(`${parsed.data.from}T00:00:00.000Z`),
          lte: new Date(`${parsed.data.to}T00:00:00.000Z`),
        },
      },
      orderBy: { localDate: 'asc' },
      select: SELECT,
    });

    return {
      success: true,
      data: rows.map((row) => ({
        ...row,
        localDate: localDateKey(row.localDate),
        bedAt: row.bedAt.toISOString(),
        wakeAt: row.wakeAt.toISOString(),
      })),
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load sleep logs');
    logger.error(`Get sleep logs error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
