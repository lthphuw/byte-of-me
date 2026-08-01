'use server';

import { prisma } from '@byte-of-me/db';

import type { AdminProject } from '@/entities/project/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { buildPaginatedMeta, clampPagination } from '@/shared/lib/pagination';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';


export async function getPaginatedAdminProjects(
  rawPage: number = 1,
  rawLimit: number = 20
): Promise<ApiResponse<PaginatedData<AdminProject>>> {
  try {
    const session = await requireAdmin();
    const userId = session.id;

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
        include: {
          // project-editor-card.tsx and project-dialog.tsx read title and
          // description only (see AdminProject); createdAt/updatedAt never
          // reach either.
          translations: {
            select: {
              id: true,
              language: true,
              title: true,
              description: true,
            },
          },
          techStacks: true,
          tags: {
            include: {
              tag: {
                include: {
                  translations: {
                    select: {
                      id: true,
                      language: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          coauthors: {
            include: {
              coauthor: true,
            },
          },
        },
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
    return {
      success: false,
      errorMsg: getErrorMessage(error, 'Failed to fetch media'),
    };
  }
}
