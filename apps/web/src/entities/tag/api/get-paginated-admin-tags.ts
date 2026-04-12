'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminTag } from '@/entities/tag';
import { requireUser } from '@/features/auth/lib/session';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

export async function getPaginatedAdminTags(
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<PaginatedData<AdminTag>>> {
  try {
    const user = await requireUser();

    const skip = (page - 1) * limit;
    const [tags, totalCount] = await Promise.all([
      prisma.tag.findMany({
        include: {
          translations: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limit,
      }),
      prisma.tag.count({}),
    ]);

    return {
      success: true,
      data: {
        data: tags,
        meta: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasMore: skip + tags.length < totalCount,
        },
      },
    };
  } catch (e: any) {
    logger.error(`[Service Error] getAdminTag: ${e.message}`);
    return {
      success: false,
      errorMsg: e.message,
    };
  }
}
