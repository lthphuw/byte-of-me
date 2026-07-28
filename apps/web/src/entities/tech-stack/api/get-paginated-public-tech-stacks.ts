'use server';

import { prisma } from '@byte-of-me/db';

import type { PublicTechStack } from '@/entities/tech-stack/model/types';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { buildPaginatedMeta, clampPagination } from '@/shared/lib/pagination';
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
            include: {
              logo: true,
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
          data: items as PublicTechStack[],
          meta: buildPaginatedMeta({ page, limit, totalCount: count }),
        };
      },
      {
        cache: true,
        cacheKey: [CACHE_TAGS.TECH, String(page), String(limit)],
        cacheTags: [CACHE_TAGS.TECH],
      }
    );
  });
}
