'use server';

import { prisma } from '@byte-of-me/db';
import { Prisma } from '../../../../../../../packages/db/generated/prisma/client';

import { ApiActionResponse } from '@/types/api/api-action.type';
import { PaginatedData } from '@/types/api/paginated.type';
import { requireUser } from '@/lib/auth/session';

export type ProjectDetails = Prisma.ProjectGetPayload<{
  include: {
    translations: true;
    techStacks: true;
    tags: {
      include: {
        tag: {
          include: {
            translations: true;
          };
        };
      };
    };
  };
}>;

export async function getPaginatedProject(
  page: number = 1,
  limit: number = 20,

): Promise<ApiActionResponse<PaginatedData<ProjectDetails>>> {

  try {
    const session = await requireUser();
    const userId = session.id

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
                }
              }
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
