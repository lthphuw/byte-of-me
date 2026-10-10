'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminFeaturedWork } from '@/entities/featured-work/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { buildPaginatedMeta, clampPagination } from '@/shared/lib/pagination';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

export async function getPaginatedAdminFeaturedWorks(
  rawPage: number = 1,
  rawLimit: number = 20
): Promise<ApiResponse<PaginatedData<AdminFeaturedWork>>> {
  try {
    const session = await requireAdmin();
    const userId = session.id;
    const { page, limit } = clampPagination(
      { page: rawPage, limit: rawLimit },
      { defaultLimit: 20 }
    );
    const skip = (page - 1) * limit;

    const [items, totalCount] = await Promise.all([
      prisma.featuredWork.findMany({
        where: { userId },
        include: {
          // Every save rewrites translations with `deleteMany` + `create`, so
          // physical row order changes each time; sort so the fallback
          // language resolves the same way on every read.
          translations: {
            select: { id: true, language: true, title: true, description: true },
            orderBy: { language: 'asc' },
          },
        },
        // `id` breaks ties between equal `sortOrder`s so `skip`/`take` cannot
        // repeat a row across pages.
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.featuredWork.count({ where: { userId } }),
    ]);

    return {
      success: true,
      data: {
        data: items,
        meta: buildPaginatedMeta({ page, limit, totalCount }),
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to fetch featured works');
    logger.error(`Get paginated admin featured works error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
