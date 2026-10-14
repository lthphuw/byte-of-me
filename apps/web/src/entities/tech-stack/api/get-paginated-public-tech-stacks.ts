'use server';

import { prisma } from '@byte-of-me/db';

import type { PublicTechStack } from '@/entities/tech-stack/model/types';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';
import { CACHE_TAGS } from '@/shared/lib/constants';
import {
  buildPaginatedMeta,
  clampPagination,
  MAX_CACHED_PAGE,
} from '@/shared/lib/pagination';
import { PUBLIC_MEDIA_SELECT } from '@/shared/lib/public-media';
import type { PaginatedData, PaginatedParams } from '@/shared/types/api';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function getPaginatedPublicTechStacks(
  pagination: PaginatedParams
): Promise<ApiResponse<PaginatedData<PublicTechStack>>> {
  const { page, limit } = clampPagination(pagination, { defaultLimit: 10 });
  return handlePublicAction('getPaginatedTechStacks', async () => {
    return await withPublicActionHandler(
      'getPaginatedTechStacks',
      async ({ userId }) => {
        const skip = (page - 1) * limit;
        const where = { userId };

        const [items, count] = await Promise.all([
          prisma.techStack.findMany({
            where,
            select: {
              id: true,
              createdAt: true,
              updatedAt: true,
              name: true,
              slug: true,
              group: true,
              sortOrder: true,
              logo: { select: PUBLIC_MEDIA_SELECT },
            },
            orderBy: {
              sortOrder: 'desc',
            },
            skip,
            take: limit,
          }),
          prisma.techStack.count({
            where,
          }),
        ]);

        return {
          data: items satisfies PublicTechStack[],
          meta: buildPaginatedMeta({ page, limit, totalCount: count }),
        };
      },
      {
        // A page past the cap is read live: each page is its own cache entry.
        cache: page <= MAX_CACHED_PAGE,
        cacheKey: [CACHE_TAGS.TECH, String(page), String(limit)],
        cacheTags: [CACHE_TAGS.TECH],
      }
    );
  });
}
