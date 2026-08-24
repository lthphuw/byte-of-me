'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { unstable_cache } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';

export type DashboardStats = {
  totalMessages: number;
  totalProjects: number;
  totalBlogs: number;
  totalEducation: number;
  totalCompanies: number;
  totalTechStack: number;
  totalTags: number;
  newMessages: number;
};

/** What "new" means on the messages tile: the trailing seven days. */
const NEW_MESSAGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * A backstop, not the freshness budget.
 *
 * Every table below is invalidated by a `CACHE_TAGS` tag on create, update and
 * delete — including the one write an anonymous visitor can trigger, since
 * `send-contact-message` calls `revalidateTag(CACHE_TAGS.CONTACT, 'max')`. So
 * the tags do the real work and this hour is only a ceiling on how long a
 * *future* write path that forgets its tag could keep a tile wrong.
 *
 * The one change tags genuinely cannot catch is a message ageing *out* of the
 * seven-day window: nothing writes at that moment, so nothing revalidates. An
 * hour of drift on "3 new this week" is invisible — that number is read as a
 * rough signal, not to the minute — which is why the backstop can be this long
 * rather than the five minutes the analytics card needs.
 */
const STATS_REVALIDATE_SECONDS = 60 * 60;

/**
 * Postgres `count(*)` is `bigint`, and the driver hands it back as a JS
 * `BigInt` — which `JSON.stringify` throws on, so an unconverted one would
 * fail the RSC payload rather than render a wrong number. Converted to
 * `Number` at the boundary below, the same way the analytics rollup already
 * treats its `::bigint` views.
 */
type DashboardStatsRow = {
  totalMessages: bigint;
  totalProjects: bigint;
  totalBlogs: bigint;
  totalEducation: bigint;
  totalCompanies: bigint;
  totalTechStack: bigint;
  totalTags: bigint;
  newMessages: bigint;
};

/**
 * The eight tiles, in one round trip.
 *
 * This was eight `prisma.*.count()` calls in a `Promise.all`: eight statements,
 * eight pgbouncer slots, and eight × ~92ms to Supabase's Tokyo region measured
 * from a developer's machine — for eight scalars that fit in a single row.
 * Eight scalar subqueries return exactly the same eight numbers.
 *
 * Two details the `count()` calls carried that are easy to lose here:
 *
 * - `tech_stacks` and `tags` are **unscoped** on purpose (`where: {}` before),
 *   because both are shared vocabularies rather than owner content. The other
 *   six stay scoped to the owner.
 * - `contact_messages` is the one model whose owner column has no `@map`, so
 *   it is `"userId"` where every other table here is `"user_id"`. Getting that
 *   wrong is a silent `column does not exist`, not a wrong number.
 */
async function readDashboardStats(userId: string): Promise<DashboardStats> {
  // Computed in JS, exactly as before, and bound as a parameter rather than
  // written as `now() - interval '7 days'` — the boundary semantics stay the
  // ones the tile has always had. Computed *inside* this function rather than
  // captured from the caller on purpose: a captured `Date.now()` would put a
  // millisecond into the cache key and no entry would ever be reused.
  const newMessagesSince = new Date(Date.now() - NEW_MESSAGE_WINDOW_MS);

  const [row] = await prisma.$queryRaw<DashboardStatsRow[]>`
    SELECT
      (SELECT count(*)::bigint FROM "contact_messages"
        WHERE "userId" = ${userId})                          AS "totalMessages",
      (SELECT count(*)::bigint FROM "projects"
        WHERE "user_id" = ${userId})                         AS "totalProjects",
      (SELECT count(*)::bigint FROM "blogs"
        WHERE "user_id" = ${userId})                         AS "totalBlogs",
      (SELECT count(*)::bigint FROM "educations"
        WHERE "user_id" = ${userId})                         AS "totalEducation",
      (SELECT count(*)::bigint FROM "companies"
        WHERE "user_id" = ${userId})                         AS "totalCompanies",
      (SELECT count(*)::bigint FROM "tech_stacks")           AS "totalTechStack",
      (SELECT count(*)::bigint FROM "tags")                  AS "totalTags",
      (SELECT count(*)::bigint FROM "contact_messages"
        WHERE "userId" = ${userId}
          AND "created_at" >= ${newMessagesSince})           AS "newMessages"
  `;

  if (!row) {
    // A select of scalar subqueries always produces exactly one row, so no row
    // means the statement did not run the way this code believes it did.
    // Throwing routes that into the caller's error envelope; returning eight
    // zeroes would render a working portfolio as an empty one.
    throw new Error('Dashboard stats query returned no rows');
  }

  return {
    totalMessages: Number(row.totalMessages),
    totalProjects: Number(row.totalProjects),
    totalBlogs: Number(row.totalBlogs),
    totalEducation: Number(row.totalEducation),
    totalCompanies: Number(row.totalCompanies),
    totalTechStack: Number(row.totalTechStack),
    totalTags: Number(row.totalTags),
    newMessages: Number(row.newMessages),
  };
}

export async function getDashboardStats(): Promise<
  | { success: true; data: DashboardStats }
  | { success: false; data: null; errorMsg: string }
> {
  try {
    // Stays here, and stays *outside* the cached callback, for two separate
    // reasons. §5: the guard is the security boundary, and this function is an
    // addressable endpoint whether or not the dashboard layout ever rendered.
    // And `unstable_cache` runs its callback with no cookies, headers or
    // session — reading the session in there would throw on the miss and, on a
    // hit, would not run at all. So the id travels in as an argument and into
    // the key, which is also what stops one identity's numbers from ever being
    // served to another.
    const session = await requireAdmin();
    const userId = session.id;

    const cached = unstable_cache(
      () => readDashboardStats(userId),
      ['dashboard-stats', userId],
      {
        // One tag per table the statement reads. Each of these is revalidated
        // by that entity's create, update *and* delete action — verified by
        // reading the write paths, not assumed.
        tags: [
          CACHE_TAGS.CONTACT,
          CACHE_TAGS.PROJECT,
          CACHE_TAGS.BLOG,
          CACHE_TAGS.EDUCATION,
          CACHE_TAGS.COMPANY,
          CACHE_TAGS.TECH,
          CACHE_TAGS.TAG,
        ],
        revalidate: STATS_REVALIDATE_SECONDS,
      }
    );

    return { success: true, data: await cached() };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to fetch dashboard stats');
    logger.error(`Get Dashboard stats  Error: ${errorMsg}`);
    return { success: false, data: null, errorMsg };
  }
}
