'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { sleepLogUpsertSchema } from '@/entities/sleep-log/model/sleep-log-schema';
import type { SleepLogRow } from '@/entities/sleep-log/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { localDateKey, toLocalDate } from '@/shared/lib/health/local-date';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Write one night.
 *
 * An UPSERT on `(ownerId, localDate)`, not an insert: the form is filled
 * roughly on waking and corrected that evening, and that is the normal flow
 * rather than an edge case. The unique index is what makes it atomic instead
 * of a select-then-insert with a race in the middle.
 *
 * `localDate` is derived from `wakeAt`, never sent by the client. A sleep from
 * 23:40 to 07:10 belongs to the morning it ends, and letting the client name
 * the day would put the one column both health domains join on under the
 * caller's control.
 *
 * `requireAdmin`, despite the name, is an IDENTITY check for the single site
 * owner (`getAuthenticatedAdmin` narrows on `isSiteOwnerEmail`), which is
 * exactly right for a private health log. It is called here and not merely in
 * the layout because a server action is an addressable endpoint that never
 * renders one (AGENTS §5).
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
      timeZone,
      latencyMin,
      awakeningsMin,
      quality,
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
      latencyMin,
      awakeningsMin,
      quality,
      note,
      isFreeDay,
      factors,
    };

    const row = await prisma.sleepLog.upsert({
      where: {
        ownerId_localDate: { ownerId: session.id, localDate },
      },
      create: { ...fields, localDate, ownerId: session.id },
      update: fields,
      select: {
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
      },
    });

    return {
      success: true,
      data: {
        ...row,
        localDate: localDateKey(row.localDate),
        bedAt: row.bedAt.toISOString(),
        wakeAt: row.wakeAt.toISOString(),
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to save sleep log');
    logger.error(`Upsert sleep log error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
