'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { sleepRangeSchema } from '@/entities/sleep-log/model/sleep-log-schema';
import {
  SLEEP_LOG_SELECT,
  toSleepLogRow,
} from '@/entities/sleep-log/model/sleep-log-select';
import type { SleepLogRow } from '@/entities/sleep-log/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * One window of nights, oldest first. Bounded at BOTH ends and validated, so
 * no caller can turn it into an unbounded scan. `uniq_sleep_logs_owner_date`
 * serves it directly: it leads with `owner_id` and ranges on `local_date`.
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
      select: SLEEP_LOG_SELECT,
    });

    return {
      success: true,
      data: rows.map(toSleepLogRow),
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load sleep logs');
    logger.error(`Get sleep logs error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
