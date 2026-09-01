'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { sleepLogUpsertSchema } from '@/entities/sleep-log/model/sleep-log-schema';
import {
  SLEEP_LOG_SELECT,
  toSleepLogRow,
} from '@/entities/sleep-log/model/sleep-log-select';
import type { SleepLogRow } from '@/entities/sleep-log/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { toLocalDate } from '@/shared/lib/health/local-date';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * One night. An UPSERT on `(ownerId, localDate)`, the unique index making it
 * atomic — the form is filled on waking and corrected that evening, which is
 * the normal flow.
 *
 * `localDate` is DERIVED from `wakeAt`, never client-sent: the column both
 * health domains join on must not be under the caller's control. `loggedAt`
 * is stamped here on CREATE only, which `updatedAt` cannot answer for.
 *
 * `requireAdmin` is an IDENTITY check for the single owner, called here and
 * not merely in the layout because a server action is an addressable endpoint
 * that renders no layout (§5).
 */
export async function upsertSleepLog(
  input: unknown
): Promise<ApiResponse<SleepLogRow>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(sleepLogUpsertSchema, input, 'upsertSleepLog');
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const {
      bedAt,
      wakeAt,
      riseAt,
      timeZone,
      latencyMin,
      awakeningsMin,
      awakeningsCount,
      quality,
      restedness,
      napBucket,
      note,
      isFreeDay,
      factors,
    } = parsed.data;

    const bed = new Date(bedAt);
    const wake = new Date(wakeAt);
    const localDate = toLocalDate(wake, timeZone);

    const fields = {
      bedAt: bed,
      wakeAt: wake,
      riseAt: riseAt === null ? null : new Date(riseAt),
      latencyMin,
      awakeningsMin,
      awakeningsCount,
      quality,
      restedness,
      napBucket,
      note,
      isFreeDay,
      factors,
    };

    const row = await prisma.sleepLog.upsert({
      where: {
        ownerId_localDate: { ownerId: session.id, localDate },
      },
      // `loggedAt` on create only. On update it is deliberately absent rather
      // than refreshed: the first write is the one the recall question is
      // about, and `updatedAt` already records the latest touch.
      create: {
        ...fields,
        localDate,
        ownerId: session.id,
        loggedAt: new Date(),
      },
      update: fields,
      select: SLEEP_LOG_SELECT,
    });

    return { success: true, data: toSleepLogRow(row) };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to save sleep log');
    logger.error(`Upsert sleep log error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
