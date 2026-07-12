'use server';

import { type Prisma, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminTranslation } from '@/entities/translation/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { buildPaginatedMeta } from '@/shared/lib/pagination';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

export async function getPaginatedAdminTranslations(
  page: number = 1,
  limit: number = 20,
  filter?: {
    search?: string;
  }
): Promise<ApiResponse<PaginatedData<AdminTranslation>>> {
  try {
    await requireAdmin();

    const skip = (page - 1) * limit;

    const where: Prisma.TranslationWhereInput = {
      ...(filter?.search && {
        OR: [
          {
            sourceText: {
              contains: filter.search,
              mode: 'insensitive',
            },
          },
          {
            translated: {
              contains: filter.search,
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    const [items, totalCount] = await Promise.all([
      prisma.translation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.translation.count({ where }),
    ]);

    return {
      success: true,
      data: {
        data: items,
        meta: buildPaginatedMeta({ page, limit, totalCount }),
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error(`[Translation] getPaginatedAdmin: ${errorMsg}`);
    return {
      success: false,
      errorMsg,
    };
  }
}
