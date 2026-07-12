'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminTag } from '@/entities/tag';
import { requireAdmin } from '@/shared/lib/auth';
import { buildPaginatedMeta } from '@/shared/lib/pagination';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

export async function getPaginatedAdminTags(
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<PaginatedData<AdminTag>>> {
  try {
    await requireAdmin();

    const skip = (page - 1) * limit;
    const [tags, totalCount] = await Promise.all([
      prisma.tag.findMany({
        include: {
          translations: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.tag.count({}),
    ]);

    return {
      success: true,
      data: {
        data: tags,
        meta: buildPaginatedMeta({ page, limit, totalCount }),
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error(`[Service Error] getAdminTag: ${errorMsg}`);
    return {
      success: false,
      errorMsg,
    };
  }
}
