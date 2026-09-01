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
 * `loggedAt` is stamped HERE and only on create. It answers "when was this
 * written", which `updatedAt` cannot: every later correction moves that, so a
 * night reconstructed three days late and then touched again would look like
 * same-morning data. The client never supplies it.
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
