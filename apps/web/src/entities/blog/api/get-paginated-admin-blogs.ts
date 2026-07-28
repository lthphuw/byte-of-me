'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminBlog } from '@/entities/blog';
import { requireAdmin } from '@/shared/lib/auth';
import { buildPaginatedMeta, clampPagination } from '@/shared/lib/pagination';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

export async function getPaginatedAdminBlogs(
  rawPage: number,
  rawLimit: number
): Promise<ApiResponse<PaginatedData<AdminBlog>>> {
  try {
    const session = await requireAdmin();
    const userId = session.id;
    const { page, limit } = clampPagination(
      { page: rawPage, limit: rawLimit },
      { defaultLimit: 20 }
    );
    const skip = (page - 1) * limit;

    const [items, count] = await Promise.all([
      prisma.blog.findMany({
        where: { userId },
        include: {
          coverImage: true,
          translations: true,
          project: {
            include: {
              translations: true,
            },
          },
          tags: {
            include: {
              tag: {
                include: {
                  translations: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
      }),
      prisma.blog.count({
        where: { userId },
      }),
    ]);

    return {
      success: true,
      data: {
        data: items,
        meta: buildPaginatedMeta({ page, limit, totalCount: count }),
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error(`Get paginated blogs error: ${errorMsg}`);
    return {
      success: false,
      errorMsg,
    };
  }
}
