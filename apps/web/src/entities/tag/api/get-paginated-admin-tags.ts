'use server';

import type { ApiResponse, PaginatedData } from '@byte-of-me/api-core';
import { buildPaginatedMeta, clampPagination } from '@byte-of-me/api-core';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { adminTagInclude } from '@/entities/tag/model/admin-tag-include';
import type { AdminTag } from '@/entities/tag/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function getPaginatedAdminTags(
  rawPage: number = 1,
  rawLimit: number = 20
): Promise<ApiResponse<PaginatedData<AdminTag>>> {
  await requireAdmin();

  try {
    const { page, limit } = clampPagination(
      { page: rawPage, limit: rawLimit },
      { defaultLimit: 20 }
    );
    const skip = (page - 1) * limit;
    const [tags, totalCount] = await Promise.all([
      prisma.tag.findMany({
        include: adminTagInclude,
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
    logger.error(`[Service Error] getPaginatedAdminTags: ${errorMsg}`);
    return {
      success: false,
      errorMsg,
    };
  }
}
