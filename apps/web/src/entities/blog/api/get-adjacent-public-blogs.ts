'use server';

import { prisma } from '@byte-of-me/db';

import type { BlogSummary } from '@/entities/blog/model/types';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';
import { CACHE_TAGS } from '@/shared/lib/constants';
import {
  getTranslatedContent,
  getTranslationLanguages,
} from '@/shared/lib/i18n-utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export interface AdjacentBlogs {
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
  const publishedAt = publishedDate ? new Date(publishedDate) : null;

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
              id: { not: currentId },
              publishedDate: { gt: publishedAt },
            },
            orderBy: { publishedDate: 'asc' },
            include,
          }),
          prisma.blog.findFirst({
            where: {
              isPublished: true,
              id: { not: currentId },
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
          currentId,
          publishedAt?.toISOString() ?? 'unpublished',
        ],
        cacheTags: [CACHE_TAGS.BLOG],
      }
    );
  });
}
