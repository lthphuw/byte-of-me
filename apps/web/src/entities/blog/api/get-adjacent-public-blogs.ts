'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import {
  CACHE_TAGS,
  cuidSchema,
  getTranslatedContent,
  getTranslationLanguages,
} from '@byte-of-me/api-core';
import { parseInput } from '@byte-of-me/api-core/server';
import { prisma } from '@byte-of-me/db';
import { z } from 'zod';

import type { BlogSummary } from '@/entities/blog/model/types';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';

/**
 * `currentId` and the date become a cache key, so both are checked first.
 * `z.coerce.date()` accepts the string form an `unstable_cache` hit hands
 * back; an unparsable value is refused rather than keyed as `Invalid Date`.
 */
const adjacentBlogsParamsSchema = z.object({
  publishedDate: z.coerce.date().nullable(),
  currentId: cuidSchema,
});

interface AdjacentBlogs {
  /** The next (newer) post, or null if this is the newest. */
  next: Maybe<BlogSummary>;
  /** The previous (older) post, or null if this is the oldest. */
  prev: Maybe<BlogSummary>;
}

/**
 * The published posts immediately newer and older than the given one, ordered
 * by publishedDate. Powers the prev/next navigation on the blog detail page.
 */
export async function getAdjacentPublicBlogs(
  // Callers pass the date straight from getPublicBlogBySlug, which is itself
  // cached — unstable_cache serializes Date to string on a cache hit, so this
  // arrives as either.
  publishedDate: Maybe<Date | string>,
  currentId: string
): Promise<ApiResponse<AdjacentBlogs>> {
  const parsed = parseInput(
    adjacentBlogsParamsSchema,
    { publishedDate: publishedDate ?? null, currentId },
    'getAdjacentPublicBlogs'
  );
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }
  const { publishedDate: publishedAt, currentId: blogId } = parsed.data;

  return handlePublicAction('getAdjacentPublicBlogs', async () => {
    return await withPublicActionHandler(
      'getAdjacentPublicBlogs',
      async ({ locale }): Promise<AdjacentBlogs> => {
        if (!publishedAt) return { next: null, prev: null };

        // The prev/next links only need a title, so the translations read is
        // narrowed to the locale (+ 'en' fallback) and the title column.
        const include = {
          translations: {
            where: { language: { in: getTranslationLanguages(locale) } },
            select: { language: true, title: true },
          },
        } as const;

        const [nextRow, prevRow] = await Promise.all([
          prisma.blog.findFirst({
            where: {
              isPublished: true,
              id: { not: blogId },
              publishedDate: { gt: publishedAt },
            },
            orderBy: { publishedDate: 'asc' },
            include,
          }),
          prisma.blog.findFirst({
            where: {
              isPublished: true,
              id: { not: blogId },
              publishedDate: { lt: publishedAt },
            },
            orderBy: { publishedDate: 'desc' },
            include,
          }),
        ]);

        const toSummary = (row: typeof nextRow): Maybe<BlogSummary> => {
          if (!row) return null;
          const translated = getTranslatedContent(row.translations, locale);
          return {
            id: row.id,
            slug: row.slug,
            title: translated?.title || '',
          };
        };

        return { next: toSummary(nextRow), prev: toSummary(prevRow) };
      },
      {
        cache: true,
        cacheKey: [
          'adjacent-public-blogs',
          blogId,
          publishedAt?.toISOString() ?? 'unpublished',
        ],
        cacheTags: [CACHE_TAGS.BLOG],
      }
    );
  });
}
