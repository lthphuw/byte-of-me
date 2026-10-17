'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import {
  CACHE_TAGS,
  getTranslatedContent,
  getTranslationLanguages,
  INTERACTION,
} from '@byte-of-me/api-core';
import { Prisma, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { unstable_cache } from 'next/cache';
import { getLocale } from 'next-intl/server';

import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

const DAYS = 30;

/** How many posts the "Top posts" list shows. */
const TOP_BLOGS = 5;

/**
 * Five minutes, and the clock is the only invalidation: public traffic (views, claps) never calls
 * `revalidateTag`, so the `BLOG` tag only catches retitles and deletes. A 30-day chart does not
 * visibly change in 5 min; shorter wastes a six-statement Tokyo round trip, longer feels stale.
 */
const ANALYTICS_REVALIDATE_SECONDS = 5 * 60;

type DailyViews = {
  date: string;
  views: number;
};

type TopBlog = {
  id: string;
  title: string;
  views: number;
};

type AnalyticsOverviewData = {
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

/**
 * One row per bucket: `kind` names the aggregate, `key` its grouping value (day, blog id, type or
 * none). `value` is `bigint`: the driver returns Postgres `count(*)` as `BigInt`, which no RSC
 * payload serializes.
 */
type AggregateRow = {
  kind: 'day' | 'top' | 'interaction' | 'total';
  key: string;
  value: bigint;
};

type TopBlogTitleRow = {
  id: string;
  slug: string;
  language: string | null;
  title: string | null;
};

/**
 * The four aggregates in one `UNION ALL` round trip (four statements cost 4 x ~92ms to Tokyo).
 * `UNION ALL` promises no order: the top-5 branch is re-sorted in JS; its inner `ORDER BY` picks
 * which five. Ties break on `blog_id`, else a cache entry freezes one arbitrary ordering.
 */
async function readAggregates(since: Date): Promise<AggregateRow[]> {
  return await prisma.$queryRaw<AggregateRow[]>`
    SELECT
      'day'::text AS "kind",
      to_char(date_trunc('day', "created_at"), 'YYYY-MM-DD') AS "key",
      count(*)::bigint AS "value"
    FROM "blog_view_logs"
    WHERE "created_at" >= ${since}
    GROUP BY 2

    UNION ALL

    -- Windowed to the same 30 days as everything beside it on the card. It
    -- was unbounded, so "top posts" aggregated the whole view log — a full
    -- table scan, and an all-time ranking sitting next to 30-day figures.
    SELECT 'top'::text, "blog_id", "views"
    FROM (
      SELECT "blog_id", count(*)::bigint AS "views"
      FROM "blog_view_logs"
      WHERE "created_at" >= ${since}
      GROUP BY "blog_id"
      ORDER BY "views" DESC, "blog_id" ASC
      LIMIT ${TOP_BLOGS}
    ) AS "ranked"

    UNION ALL

    SELECT 'interaction'::text, "type", count(*)::bigint
    FROM "interactions"
    GROUP BY "type"

    UNION ALL

    -- All-time by definition ("Blog Views / All time"), so it stays a full
    -- count; making it cheap needs a DB index, which is a gated task.
    SELECT 'total'::text, ''::text, count(*)::bigint
    FROM "blog_view_logs"
  `;
}

/**
 * Titles for the top posts in one round trip: a nested `select` costs a second statement
 * (`relationLoadStrategy` is unavailable). LEFT JOIN so an untranslated post falls to its slug.
 */
async function readTopBlogTitles(
  blogIds: string[],
  locale: string
): Promise<TopBlogTitleRow[]> {
  if (blogIds.length === 0) return [];

  const languages = getTranslationLanguages(locale);

  return await prisma.$queryRaw<TopBlogTitleRow[]>(Prisma.sql`
    SELECT b."id", b."slug", t."language", t."title"
    FROM "blogs" AS b
    LEFT JOIN "blog_translations" AS t
      ON t."blog_id" = b."id"
     AND t."language" IN (${Prisma.join(languages)})
    WHERE b."id" IN (${Prisma.join(blogIds)})
  `);
}

async function readAnalyticsOverview(
  since: Date,
  locale: string
): Promise<AnalyticsOverviewData> {
  const rows = await readAggregates(since);

  const viewsPerDay = new Map<string, number>(
    rows
      .filter((row) => row.kind === 'day')
      .map((row) => [row.key, Number(row.value)])
  );

  const viewsByDay: DailyViews[] = Array.from({ length: DAYS }, (_, i) => {
    const day = new Date(since);
    day.setUTCDate(day.getUTCDate() + i);
    const date = day.toISOString().slice(0, 10);
    return { date, views: viewsPerDay.get(date) ?? 0 };
  });

  const ranked = rows
    .filter((row) => row.kind === 'top')
    .map((row) => ({ blogId: row.key, views: Number(row.value) }))
    // Re-imposing the `ORDER BY` the `UNION ALL` was free to discard. Same
    // comparison the SQL uses, so the list reads identically either way.
    .sort((a, b) => b.views - a.views || a.blogId.localeCompare(b.blogId));

  const titleRows = await readTopBlogTitles(
    ranked.map((row) => row.blogId),
    locale
  );

  // The join returns one row per (blog, translation), so the translations are
  // folded back into the shape `getTranslatedContent` expects — the helper, not
  // a second locale rule, is what decides the fallback order.
  const byBlog = new Map<
    string,
    { slug: string; translations: { language: string; title: string }[] }
  >();
  for (const row of titleRows) {
    const entry = byBlog.get(row.id) ?? { slug: row.slug, translations: [] };
    if (row.language !== null && row.title !== null) {
      entry.translations.push({ language: row.language, title: row.title });
    }
    byBlog.set(row.id, entry);
  }

  const topBlogs: TopBlog[] = ranked.map((row) => {
    const blog = byBlog.get(row.blogId);
    const title =
      (blog && getTranslatedContent(blog.translations, locale)?.title) ||
      blog?.slug ||
      'Untitled';
    return { id: row.blogId, title, views: row.views };
  });

  const countByType = (type: INTERACTION) =>
    Number(
      rows.find((row) => row.kind === 'interaction' && row.key === type)
        ?.value ?? 0n
    );

  const totalBlogViews = Number(
    rows.find((row) => row.kind === 'total')?.value ?? 0n
  );

  const last30Days = viewsByDay.reduce((sum, d) => sum + d.views, 0);

  return {
    viewsByDay,
    totalViewsLast30Days: last30Days,
    topBlogs,
    likes: countByType(INTERACTION.LIKE),
    claps: countByType(INTERACTION.CLAP),
    blogViews: {
      total: totalBlogViews,
      last30Days,
    },
  };
}

export async function getAnalyticsOverview(): Promise<
  ApiResponse<AnalyticsOverviewData>
> {
  // Request state (session, locale) must be read out here: `unstable_cache` has no cookies,
  // headers or session. `requireAdmin` sits above the `try` so a refusal rejects (§5).
  const session = await requireAdmin();
  const locale = await getLocale();

  try {
    // UTC midnight keeps the cache key stable for a day. Computed inside the callback, an
    // entry filled at 23:59 would keep drawing yesterday's window until it expired.
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (DAYS - 1));

    const cached = unstable_cache(
      () => readAnalyticsOverview(since, locale),
      [
        'analytics-overview',
        // Site-wide traffic, so the id narrows no query; it is in the key so owner-private
        // numbers can never reach a second identity if `requireAdmin` ever widens.
        session.id,
        // The titles are locale-resolved, so `en` and `vi` are different data.
        locale,
        since.toISOString(),
      ],
      {
        // `BLOG` is the only tagged table read (titles); the counters have no tag or tagged
        // writer, so `revalidate` is what keeps this card moving.
        tags: [CACHE_TAGS.BLOG],
        revalidate: ANALYTICS_REVALIDATE_SECONDS,
      }
    );

    // Only strings and numbers cross this boundary: `unstable_cache` returns a `Date` as a
    // string on a hit, so the shape would differ between hit and miss.
    return { success: true, data: await cached() };
  } catch (error) {
    const errorMsg = getErrorMessage(
      error,
      'Failed to fetch analytics overview'
    );
    logger.error(`Get analytics overview error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
