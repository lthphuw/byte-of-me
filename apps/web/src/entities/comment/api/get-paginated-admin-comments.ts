'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminComment } from '@/entities/comment/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { buildPaginatedMeta, clampPagination } from '@/shared/lib/pagination';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

export async function getPaginatedAdminComments(
  rawPage: number = 1,
  rawLimit: number = 20
): Promise<ApiResponse<PaginatedData<AdminComment>>> {
  try {
    const session = await requireAdmin();

    const { page, limit } = clampPagination(
      { page: rawPage, limit: rawLimit },
      { defaultLimit: 20 }
    );
    const skip = (page - 1) * limit;

    // Scoped to the admin's OWN content — both statements had no `where` at
    // all, so this listed and counted every comment in the database. A comment
    // always carries the blog or project it was left on (`postComment` sets
    // `blogId` on replies too), so the owner is reachable through it; a row
    // attached to neither is not "a comment on your content" and stays out.
    const where = {
      OR: [
        { blog: { userId: session.id } },
        { project: { userId: session.id } },
      ],
    };

    const [items, totalCount] = await Promise.all([
      prisma.comment.findMany({
        where,
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
      prisma.comment.count({ where }),
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
