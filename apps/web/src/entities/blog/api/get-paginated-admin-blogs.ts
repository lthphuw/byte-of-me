'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminBlog } from '@/entities/blog';
import { requireAdmin } from '@/shared/lib/auth';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

export async function getPaginatedAdminBlogs(
  page: number,
  limit: number
): Promise<ApiResponse<PaginatedData<AdminBlog>>> {
  try {
    const session = await requireAdmin();
    const userId = session.id;
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
        where: { userId: userId },
      }),
    ]);

    return {
      success: true,
      data: {
        data: items,
        meta: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalCount: count,
          hasMore: page < Math.ceil(count / limit),
        },
      },
    };
  } catch (e: Any) {
    logger.error(`Get paginated blogs error: ${e.message}`);
    return {
      success: false,
      errorMsg: e.message,
    };
  }
}
