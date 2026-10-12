'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { cookies } from 'next/headers';

import { checkRateLimit } from '@/shared/lib/rate-limit';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

// A single heartbeat can never legitimately report more than a few minutes.
const MAX_SECONDS_PER_UPDATE = 300;

export async function updateBlogReadingTime(
  logId: string,
  seconds: number
): Promise<ApiResponse<null>> {
  // Anonymous endpoint: only accept increments for a log this browser
  // created — trackBlogView stores the log id in a `viewed_*` cookie.
  // Without this check any caller could inflate/corrupt arbitrary rows.
  const cookieStore = await cookies();
  const ownsLog = cookieStore
    .getAll()
    .some((c) => c.name.startsWith('viewed_') && c.value === logId);

  const increment = Math.floor(seconds);
  if (!ownsLog || !Number.isFinite(increment) || increment < 1) {
    return { success: false, errorMsg: 'Reading time is not for this view' };
  }

  // The client beats every 15s, so a burst is a script. Keyed on the log id:
  // an IP bucket would throttle a whole office behind one NAT address.
  const { allowed } = await checkRateLimit({
    key: `reading-time:${logId}`,
    limit: 10,
    windowSec: 60,
  });
  if (!allowed) {
    return { success: false, errorMsg: 'Too many reading-time updates' };
  }

  try {
    await prisma.blogStatisticLog.update({
      where: { id: logId },
      data: {
        readingTime: {
          increment: Math.min(increment, MAX_SECONDS_PER_UPDATE),
        },
      },
    });

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to update reading time');
    logger.error(`Failed to update reading time for log ${logId}: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
