'use server';

import type { AdminBlog } from '@/entities/blog';
import { requireUser } from '@/features/auth/lib/session';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

export async function getPaginatedAdminBlog(
  page: number,
  limit: number
): Promise<ApiResponse<PaginatedData<AdminBlog>>> {
  try {
    const session = await requireUser();
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
          hasMore: page === Math.ceil(count / limit),
        },
      },
    };
  } catch (e: any) {
    logger.error(`Get paginated blogs error: ${e.message}`);
    return {
      success: false,
      errorMsg: e.message,
    };
  }
}
