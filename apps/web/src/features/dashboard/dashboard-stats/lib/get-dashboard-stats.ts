'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { CACHE_TAGS } from '@byte-of-me/api-core';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { unstable_cache } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

type DashboardStats = {
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
 * A backstop, not the freshness budget: every table is tag-invalidated on write (even the anonymous
 * `send-contact-message`), so this hour only caps a future write path that forgets its tag. A
 * message ageing out of the 7-day window fires no tag; an hour of drift is invisible.
 */
const STATS_REVALIDATE_SECONDS = 60 * 60;

/**
 * Postgres `count(*)` is `bigint`, returned as a JS `BigInt`, which `JSON.stringify` throws on and
 * would fail the RSC payload; converted to `Number` at the boundary below.
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
 * Eight tiles as scalar subqueries in one round trip (8 `count()`s cost 8 x ~92ms to Tokyo).
 * `tech_stacks` and `tags` are unscoped on purpose (shared); the rest are owner-scoped.
 * `contact_messages` has no `@map`: `"userId"`, not `"user_id"` (else `column does not exist`).
 */
async function readDashboardStats(userId: string): Promise<DashboardStats> {
  // Computed in JS and bound as a parameter, inside this function: a `Date.now()` captured from the
  // caller would put a millisecond in the cache key and no entry would ever be reused.
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
    // A scalar-subquery select always yields one row; none means it did not run as believed.
    // Throw: eight zeroes would render a working portfolio as an empty one.
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
  ApiResponse<DashboardStats>
> {
  // The guard stays above `try`, outside the cached callback: `unstable_cache`
  // runs with no session, so the owner's id travels in as an argument and into
  // the key. That key also keeps one owner's numbers from reaching another.
  const session = await requireAdmin();
  const userId = session.id;

  try {
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
    return { success: false, errorMsg };
  }
}
