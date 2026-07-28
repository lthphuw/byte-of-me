'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { requireAdmin } from '@/shared/lib/auth';
import { INTERACTION } from '@/shared/lib/constants';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import { getErrorMessage } from '@/shared/lib/utils';

const DAYS = 30;

export type DailyViews = {
  date: string;
  views: number;
};

export type TopBlog = {
  id: string;
  title: string;
  views: number;
};

export type AnalyticsOverviewData = {
  viewsByDay: DailyViews[];
  totalViewsLast30Days: number;
  topBlogs: TopBlog[];
  likes: number;
  claps: number;
  blogViews: {
    total: number;
    last30Days: number;
  };
};

export async function getAnalyticsOverview(): Promise<
  | { success: true; data: AnalyticsOverviewData }
  | { success: false; data: null; errorMsg: string }
> {
  try {
    await requireAdmin();

    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (DAYS - 1));

    const [viewsByDayRaw, topBlogsRaw, interactionsRaw, totalBlogViews] =
      await Promise.all([
      prisma.$queryRaw<{ day: Date; views: bigint }[]>`
        SELECT date_trunc('day', "created_at") AS "day",
               COUNT(*)::bigint AS "views"
        FROM "blog_view_logs"
        WHERE "created_at" >= ${since}
        GROUP BY 1
        ORDER BY 1 ASC
      `,

      prisma.blogStatisticLog.groupBy({
        by: ['blogId'],
        _count: { _all: true },
        orderBy: { _count: { blogId: 'desc' } },
        take: 5,
      }),

      prisma.interaction.groupBy({
        by: ['type'],
        _count: { _all: true },
      }),

      prisma.blogStatisticLog.count(),
    ]);

    const viewsPerDay = new Map<string, number>(
      viewsByDayRaw.map((row) => [
        row.day.toISOString().slice(0, 10),
        Number(row.views),
      ])
    );

    const viewsByDay: DailyViews[] = Array.from({ length: DAYS }, (_, i) => {
      const day = new Date(since);
      day.setUTCDate(day.getUTCDate() + i);
      const date = day.toISOString().slice(0, 10);
      return { date, views: viewsPerDay.get(date) ?? 0 };
    });

    const blogIds = topBlogsRaw.map((row) => row.blogId);
    const blogs = blogIds.length
      ? await prisma.blog.findMany({
          where: { id: { in: blogIds } },
          select: {
            id: true,
            slug: true,
            translations: {
              select: { language: true, title: true },
            },
          },
        })
      : [];

    const topBlogs: TopBlog[] = topBlogsRaw.map((row) => {
      const blog = blogs.find((b) => b.id === row.blogId);
      const title =
        (blog && getTranslatedContent(blog.translations, 'en')?.title) ||
        blog?.slug ||
        'Untitled';
      return { id: row.blogId, title, views: row._count._all };
    });

    const countByType = (type: INTERACTION) =>
      interactionsRaw.find((row) => row.type === type)?._count._all ?? 0;

    return {
      success: true,
      data: {
        viewsByDay,
        totalViewsLast30Days: viewsByDay.reduce((sum, d) => sum + d.views, 0),
        topBlogs,
        likes: countByType(INTERACTION.LIKE),
        claps: countByType(INTERACTION.CLAP),
        blogViews: {
          total: totalBlogViews,
          last30Days: viewsByDay.reduce((sum, d) => sum + d.views, 0),
        },
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(
      error,
      'Failed to fetch analytics overview'
    );
    logger.error(`Get analytics overview error: ${errorMsg}`);
    return { success: false, data: null, errorMsg };
  }
}
