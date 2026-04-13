'use server';

import type { PublicTechStack } from '@/entities/tech-stack/model/types';
import {
  handlePublicAction,
  withPublicActionHandler,
} from '@/shared/api/public-action-template';
import type { PaginatedData, PaginatedParams } from '@/shared/types/api';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

import { prisma } from '@byte-of-me/db';

export async function getPaginatedPublicTechStacks(
  pagination: PaginatedParams
): Promise<ApiResponse<PaginatedData<PublicTechStack>>> {
  return handlePublicAction('getPaginatedTechStacks', async () => {
    return await withPublicActionHandler(
      'getPaginatedTechStacks',
      async ({ userId, locale }) => {
        const { page = 1, limit = 10 } = pagination;
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

        const totalPages = Math.ceil(count / limit);

        return {
          data: items as PublicTechStack[],
          meta: {
            currentPage: page,
            totalPages: totalPages,
            totalCount: count,
            hasMore: page < totalPages,
          },
        };
      },
      {
        cache: true,
        cacheKey: [
          'techStacks',
          String(pagination.page),
          String(pagination.limit),
        ],
        cacheTags: ['techStacks'],
      }
    );
  });
}
