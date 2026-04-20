'use server';

import { prisma } from '@byte-of-me/db';

import { INTERACTION } from '@/shared/lib/constants';





export async function getPublicBlogStats(blogId: string) {
  const [totalViews, medianResult, totalLikes] = await Promise.all([
    prisma.blogStatisticLog.count({
      where: { blogId },
    }),

    prisma.$queryRaw<{ medianTime: number }[]>`
      SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "reading_time") as "medianTime"
      FROM "blog_view_logs"
      WHERE "blog_id" = ${blogId}
      AND "reading_time" > 5
      AND "reading_time" < 30 * 60
    `,

    prisma.interaction.count({
      where: {
        blogId,
        type: INTERACTION.LIKE,
      },
    }),
  ]);

  const medianSeconds = medianResult[0]?.medianTime || 5 * 60;

  return {
    views: totalViews || 0,
    avgTime: Math.floor(medianSeconds / 60),
    rawSeconds: Math.floor(medianSeconds),
    totalLikes,
  };
}
