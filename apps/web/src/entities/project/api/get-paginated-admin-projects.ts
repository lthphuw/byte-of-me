'use server';

import type { ApiResponse, PaginatedData } from '@byte-of-me/api-core';
import { buildPaginatedMeta, clampPagination } from '@byte-of-me/api-core';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { adminProjectInclude } from '@/entities/project/model/admin-project-include';
import type { AdminProject } from '@/entities/project/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function getPaginatedAdminProjects(
  rawPage: number = 1,
  rawLimit: number = 20
): Promise<ApiResponse<PaginatedData<AdminProject>>> {
  const session = await requireAdmin();
  const userId = session.id;

  try {
    const { page, limit } = clampPagination(
      { page: rawPage, limit: rawLimit },
      { defaultLimit: 20 }
    );
    const skip = (page - 1) * limit;
    const [items, totalCount] = await Promise.all([
      prisma.project.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: adminProjectInclude,
      }),
      prisma.project.count({
        where: { userId },
      }),
    ]);

    return {
      success: true,
      data: {
        data: items,
        meta: buildPaginatedMeta({ page, limit, totalCount }),
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to fetch projects');
    logger.error(`[Project] getPaginatedAdminProjects: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
