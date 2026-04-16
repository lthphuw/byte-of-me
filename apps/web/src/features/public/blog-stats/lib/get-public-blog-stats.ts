'use server';

import { prisma } from '@byte-of-me/db';

export async function getPublicBlogStats(blogId: string) {
  const [totalViews, engagedStats] = await Promise.all([
    prisma.blogStatisticLog.count({
      where: { blogId },
    }),

    prisma.blogStatisticLog.aggregate({
      where: {
        blogId,
        readingTime: { gt: 60 },
      },
      _avg: { readingTime: true },
    }),
  ]);

  const avgSeconds = engagedStats._avg.readingTime || 0;

  return {
    views: totalViews || 0,
    avgTime: Math.round(avgSeconds / 60),
  };
}
