'use server';

import type { AdminProject } from '@/entities/project/model/types';
import { requireUser } from '@/features/auth/lib/session';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

import { prisma } from '@byte-of-me/db';

export async function getPaginatedAdminProjects(
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<PaginatedData<AdminProject>>> {
  try {
    const session = await requireUser();
    const userId = session.id;

    const skip = (page - 1) * limit;
    const [items, totalCount] = await Promise.all([
      prisma.project.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limit,
        include: {
          translations: true,
          techStacks: true,
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
      }),
      prisma.project.count({
        where: { userId: userId },
      }),
    ]);

    return {
      success: true,
      data: {
        data: items,
        meta: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasMore: skip + items.length < totalCount,
        },
      },
    };
  } catch (error: any) {
    return {
      success: false,
      errorMsg: error.message || 'Failed to fetch media',
    };
  }
}
