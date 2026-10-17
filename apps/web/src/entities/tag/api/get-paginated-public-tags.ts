'use server';

import type {
  ApiResponse,
  PaginatedData,
  PaginatedParams,
} from '@byte-of-me/api-core';
import {
  buildPaginatedMeta,
  CACHE_TAGS,
  clampPagination,
  getTranslatedContent,
  getTranslationLanguages,
  MAX_CACHED_PAGE,
} from '@byte-of-me/api-core';
import { prisma } from '@byte-of-me/db';

import type { PublicTag } from '@/entities/tag/model/types';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';

export async function getPaginatedPublicTags(
  pagination: PaginatedParams
): Promise<ApiResponse<PaginatedData<PublicTag>>> {
  const { page, limit } = clampPagination(pagination, { defaultLimit: 10 });
  return handlePublicAction('getPaginatedTags', async () => {
    const data = await withPublicActionHandler(
      'getPaginatedTags',
      async ({ locale }) => {
        const skip = (page - 1) * limit;

        const [items, count] = await Promise.all([
          prisma.tag.findMany({
            where: {},
            include: {
              translations: {
                where: { language: { in: getTranslationLanguages(locale) } },
                select: { language: true, name: true },
              },
            },
            orderBy: {
              updatedAt: 'desc',
            },
            skip,
            take: limit,
          }),
          prisma.tag.count({
            where: {},
          }),
        ]);

        const tags: PublicTag[] = items.map((tag) => {
          const translated = getTranslatedContent(tag.translations, locale);
          return {
            id: tag.id,
            createdAt: tag.createdAt,
            updatedAt: tag.updatedAt,
            slug: tag.slug,
            name: translated?.name || '',
          };
        });

        return {
          data: tags,
          meta: buildPaginatedMeta({ page, limit, totalCount: count }),
        };
      },
      {
        // A page past the cap is read live: each page is its own cache entry.
        cache: page <= MAX_CACHED_PAGE,
        cacheKey: [CACHE_TAGS.TAG, String(page), String(limit)],
        cacheTags: [CACHE_TAGS.TAG],
      }
    );
    return data;
  });
}
