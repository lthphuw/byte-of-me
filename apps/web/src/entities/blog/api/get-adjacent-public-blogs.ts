'use server';

import { prisma } from '@byte-of-me/db';

import type { BlogSummary } from '@/entities/blog/model/types';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
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
  publishedDate: Maybe<Date>,
  currentId: string
): Promise<ApiResponse<AdjacentBlogs>> {
  return handlePublicAction('getAdjacentPublicBlogs', async () => {
    return await withPublicActionHandler(
      'getAdjacentPublicBlogs',
      async ({ locale }): Promise<AdjacentBlogs> => {
        if (!publishedDate) return { next: null, prev: null };

        const include = { translations: true } as const;

        const [nextRow, prevRow] = await Promise.all([
          prisma.blog.findFirst({
            where: {
              isPublished: true,
              id: { not: currentId },
              publishedDate: { gt: publishedDate },
            },
            orderBy: { publishedDate: 'asc' },
            include,
          }),
          prisma.blog.findFirst({
            where: {
              isPublished: true,
              id: { not: currentId },
              publishedDate: { lt: publishedDate },
            },
            orderBy: { publishedDate: 'desc' },
            include,
          }),
        ]);

        const toSummary = (
          row: typeof nextRow
        ): Maybe<BlogSummary> => {
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
        cacheKey: ['adjacent-public-blogs', currentId],
        cacheTags: [CACHE_TAGS.BLOG],
      }
    );
  });
}
