'use server';

import { Prisma, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { unstable_cache } from 'next/cache';
import { getLocale } from 'next-intl/server';

import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS, INTERACTION } from '@/shared/lib/constants';
import {
  getTranslatedContent,
  getTranslationLanguages,
} from '@/shared/lib/i18n-utils';
import { getErrorMessage } from '@/shared/lib/utils';

const DAYS = 30;

/** How many posts the "Top posts" list shows. */
const TOP_BLOGS = 5;

/**
 * Here the clock is the *only* invalidation there is, which is why this number
 * is a product decision rather than a safety net.
 *
 * `blog_view_logs` and `interactions` are written by anonymous public traffic —
 * a visitor reading a post, a visitor clapping — and none of those paths calls
 * `revalidateTag`; `toggle-blog-interaction` revalidates the post's own slug
 * tag, not a `CACHE_TAGS` entry. So the `BLOG` tag below only ever catches a
 * post being retitled or deleted. Everything the card actually counts moves
 * without telling anyone, and expires only when this runs out.
 *
 * Five minutes, because what this card answers is "how are my posts doing" over
 * a thirty-day window: a 30-day bar chart and an all-time total do not visibly
 * change in five minutes, while an owner who has just shared a link and comes
 * back to look still sees movement inside one sitting. Shorter would spend a
 * six-statement fan-out on a Tokyo round trip for a chart that cannot have
 * changed shape; much longer and the card stops feeling live at exactly the
 * moment its owner is watching it.
 */
const ANALYTICS_REVALIDATE_SECONDS = 5 * 60;

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

/**
 * One row per bucket of the combined aggregate below. `kind` says which of the
 * four aggregates the row came from, `key` is that aggregate's grouping value
 * (a `YYYY-MM-DD` day, a blog id, an interaction type, or nothing), and
 * `value` is its count — `bigint`, because Postgres `count(*)` is, and the
 * driver hands those back as JS `BigInt`s that no RSC payload can serialize.
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
 * The four aggregates behind this card, in one round trip.
 *
 * They were four statements in a `Promise.all` — the 30-day rollup, the top-5
 * group-by, the like/clap group-by and the all-time view count — four
 * independent scalars-or-small-groupings with nothing sequential between them,
 * so four × ~92ms to Supabase's Tokyo region and four pgbouncer slots for what
 * one `UNION ALL` returns. Nothing about *what* they count changes here.
 *
 * `UNION ALL` does not promise an order, so the top-5 branch is re-sorted in JS
 * below; its `ORDER BY` still has to be inside the subquery because that is
 * what picks *which* five. The tie-break on `blog_id` is new and deliberate:
 * the Prisma `groupBy` left ties to the planner, which was invisible when every
 * request re-ran the query and would be very visible now that a cache entry
 * freezes one arbitrary ordering for minutes.
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
 * Titles for the top posts, in one round trip.
 *
 * This one genuinely depends on the aggregate above — it needs the ids the
 * ranking produced — so it cannot join the statement before it. What it *can*
 * stop being is two round trips: a nested Prisma `select` on `translations`
 * always issues a second statement for the relation, and this client has no
 * join strategy available to it (`relationLoadStrategy` needs a preview
 * feature this generator does not have), so the blogs read and the
 * translations read were two Tokyo round trips for one display string each.
 *
 * The titles are display-only, so one locale (+ the `'en'` fallback) is enough
 * — the same rule `getOwnerDisplayName` follows, and the same rule the nested
 * `select` applied; it is just spelled as a join predicate now, title column
 * only. `LEFT JOIN` rather than an inner one, so a post with no translation in
 * either language still comes back and can fall through to its slug, exactly
 * as `findMany` + `getTranslatedContent` did before.
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
  | { success: true; data: AnalyticsOverviewData }
  | { success: false; data: null; errorMsg: string }
> {
  try {
    // Both of these read request state — the session and the negotiated locale
    // — so both must happen out here: `unstable_cache` runs its callback with
    // no cookies, headers or session, and on a hit does not run it at all.
    // `requireAdmin` also stays inside this function per §5, since a server
    // action is reachable without the layout that guards the view.
    const session = await requireAdmin();
    const locale = await getLocale();

    // Truncated to UTC midnight, so it only changes once a day — which is what
    // makes it safe to put in the cache key. It is *not* computed inside the
    // callback, because then a cache entry filled at 23:59 would keep drawing
    // yesterday's window until it expired; keyed like this, the entry rolls
    // over the instant the day does.
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (DAYS - 1));

    const cached = unstable_cache(
      () => readAnalyticsOverview(since, locale),
      [
        'analytics-overview',
        // The admin id does not narrow a single query here — this card counts
        // site-wide traffic, not the owner's rows. It is in the key anyway, so
        // that a cache entry of owner-private numbers can never be handed to a
        // second identity if `requireAdmin` ever widens.
        session.id,
        // The titles are locale-resolved, so `en` and `vi` are different data.
        locale,
        since.toISOString(),
      ],
      {
        // `BLOG` covers the only tagged table this reads (posts and their
        // translations, for the top-post titles). The counters underneath —
        // `blog_view_logs`, `interactions` — have no tag and no tagged writer,
        // so the `revalidate` above is what actually keeps this card moving.
        tags: [CACHE_TAGS.BLOG],
        revalidate: ANALYTICS_REVALIDATE_SECONDS,
      }
    );

    // Everything crossing this boundary is a string or a number — the dates are
    // already `YYYY-MM-DD` strings — which matters because `unstable_cache`
    // returns a `Date` as a string on a hit and would otherwise make the shape
    // differ between a hit and a miss.
    return { success: true, data: await cached() };
  } catch (error) {
    const errorMsg = getErrorMessage(
      error,
      'Failed to fetch analytics overview'
    );
    logger.error(`Get analytics overview error: ${errorMsg}`);
    return { success: false, data: null, errorMsg };
  }
}
