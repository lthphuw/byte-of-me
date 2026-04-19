'use server';

import { prisma } from '@byte-of-me/db';

import type { PublicTag } from '@/entities/tag/model/types';
import {
  handlePublicAction,
  withPublicActionHandler,
} from '@/shared/api/public-action-template';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import type { PaginatedData, PaginatedParams } from '@/shared/types/api';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function getPaginatedPublicTags(
  pagination: PaginatedParams
): Promise<ApiResponse<PaginatedData<PublicTag>>> {
  return handlePublicAction('getPaginatedTags', async () => {
    const data = await withPublicActionHandler(
      'getPaginatedTags',
      async ({ locale }) => {
        const { page = 1, limit = 10 } = pagination;
        const skip = (page - 1) * limit;

        const [items, count] = await Promise.all([
          prisma.tag.findMany({
            where: {},
            include: {
              translations: true,
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
          meta: {
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            totalCount: count,
            hasMore: page < Math.ceil(count / limit),
          },
        };
      },
      {
        cache: true,
        cacheKey: [CACHE_TAGS.TAG],
        cacheTags: [CACHE_TAGS.TAG],
      }
    );
    return data;
  });
}
