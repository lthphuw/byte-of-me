'use server';

import { prisma } from '@byte-of-me/db';

import type { PublicComment } from '@/entities';
import {
  handlePublicAction,
  withPublicActionHandler,
} from '@/shared/api/public-action-template';
import type {
  ApiResponse,
  PaginatedData,
  PaginatedParams,
} from '@/shared/types/api';

export type GetPaginatedPublicCommentsForBlog = PaginatedParams & {
  blogId: string;
};

export async function getPaginatedPublicCommentsForBlog(
  params: GetPaginatedPublicCommentsForBlog
): Promise<ApiResponse<PaginatedData<PublicComment>>> {
  return handlePublicAction('getPaginatedPublicCommentsForBlog', async () => {
    return await withPublicActionHandler(
      'getPaginatedPublicCommentsForBlog',
      async () => {
        const { blogId, limit = 8, page = 1 } = params;
        const skip = (page - 1) * limit;
        const where = { blogId, parentId: null, isDeleted: false };

        const [items, count] = await Promise.all([
          prisma.comment.findMany({
            where,
            include: {
              user: true,
            },
            orderBy: {
              updatedAt: 'desc',
            },
            take: limit,
            skip,
          }),
          prisma.comment.count({
            where,
          }),
        ]);

        const comments: PublicComment[] = items.map((cm) => ({
          id: cm.id,
          createdAt: cm.createdAt,
          content: cm.content,
          blogId: cm.blogId,
          user: {
            name: cm.user?.name ?? cm.user?.email ?? 'anonymous',
            email: cm.user?.email ?? 'anonymous',
          },
        }));

        return {
          data: comments,
          meta: {
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            totalCount: count,
            hasMore: page < Math.ceil(count / limit),
          },
        };
      },
      {
        cache: false,
      }
    );
  });
}
