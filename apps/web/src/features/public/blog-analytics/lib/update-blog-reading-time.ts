'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

export async function updateBlogReadingTime(logId: string, seconds: number) {
  try {
    const data = await prisma.blogStatisticLog.update({
      where: { id: logId },
      data: {
        readingTime: {
          increment: seconds,
        },
      },
    });

    logger.debug(`Update blog log ${logId} result: ${JSON.stringify(data)}`);

    return { success: true };
  } catch (error: Any) {
    logger.error(
      `Failed to update reading time for log ${logId}: ${error.message}`
    );
    return { success: false };
  }
}
