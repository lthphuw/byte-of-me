'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminComment } from '@/entities/comment/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { buildPaginatedMeta } from '@/shared/lib/pagination';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

export async function getPaginatedAdminComments(
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<PaginatedData<AdminComment>>> {
  try {
    await requireAdmin();

    const skip = (page - 1) * limit;

    const [items, totalCount] = await Promise.all([
      prisma.comment.findMany({
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          blog: {
            select: {
              id: true,
              slug: true,
              translations: { select: { language: true, title: true } },
            },
          },
          project: {
            select: {
              id: true,
              translations: { select: { language: true, title: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.comment.count(),
    ]);

    return {
      success: true,
      data: {
        data: items,
        meta: buildPaginatedMeta({ page, limit, totalCount }),
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to fetch comments');
    logger.error(`[Comment] getPaginatedAdmin: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
