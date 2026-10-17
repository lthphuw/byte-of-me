'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { CACHE_TAGS, cuidSchema, INTERACTION } from '@byte-of-me/api-core';
import { parseInput } from '@byte-of-me/api-core/server';
import { prisma } from '@byte-of-me/db';

import { handlePublicAction, withPublicActionHandler } from '@/shared/api';

// The median scans every view log of the blog; a reader's page view must not
// re-run it. Purged with the blog tag, and by the clock for views and likes.
const STATS_REVALIDATE_SECONDS = 300;

export type PublicBlogStats = {
  views: number;
  avgTime: number;
  rawSeconds: number;
  totalLikes: number;
};

export async function getPublicBlogStats(
  rawBlogId: string
): Promise<ApiResponse<PublicBlogStats>> {
  const parsed = parseInput(cuidSchema, rawBlogId, 'getPublicBlogStats');
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }
  const blogId = parsed.data;

  const res = await handlePublicAction('getPublicBlogStats', async () => {
    // Outside the cache: an unknown id must not mint a cache entry per guess.
    const blog = await prisma.blog.findFirst({
      where: { id: blogId, isPublished: true },
      select: { id: true },
    });
    if (!blog) return null;

    return withPublicActionHandler(
      'getPublicBlogStats',
      () => readBlogStats(blogId),
      {
        cache: true,
        cacheKey: ['getPublicBlogStats', blogId],
        cacheTags: [CACHE_TAGS.BLOG],
        revalidate: STATS_REVALIDATE_SECONDS,
      }
    );
  });

  if (!res.success) return res;
  return res.data
    ? { success: true, data: res.data }
    : { success: false, errorMsg: 'Blog not found' };
}

async function readBlogStats(blogId: string): Promise<PublicBlogStats> {
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
