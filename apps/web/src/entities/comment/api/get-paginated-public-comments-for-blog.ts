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

        const rootWhere = {
          blogId,
          parentId: null,
          isDeleted: false,
        };

        const [roots, count] = await Promise.all([
          prisma.comment.findMany({
            where: rootWhere,
            include: { user: true },
            orderBy: { updatedAt: 'desc' },
            take: limit,
            skip,
          }),
          prisma.comment.count({ where: rootWhere }),
        ]);

        const rootIds = roots.map((c) => c.id);

        const descendants = rootIds.length
          ? await prisma.comment.findMany({
              where: {
                blogId,
                isDeleted: false,
                NOT: { parentId: null },
              },
              orderBy: { updatedAt: 'asc' },
              include: { user: true },
            })
          : [];

        const map = new Map<string, (typeof descendants)[number][]>();

        for (const c of descendants) {
          if (!c.parentId) continue;
          if (!map.has(c.parentId)) map.set(c.parentId, []);
          map.get(c.parentId)!.push(c);
        }

        function collectDescendants(parentId: string): typeof descendants {
          const result: typeof descendants = [];
          const stack = [...(map.get(parentId) || [])];

          while (stack.length) {
            const current = stack.pop()!;
            result.push(current);

            if (map.has(current.id)) {
              stack.push(...map.get(current.id)!);
            }
          }

          return result;
        }

        const allCommentsRaw = roots.map((root) => ({
          ...root,
          children: collectDescendants(root.id).map((it) => ({
            id: it.id,
            createdAt: it.createdAt,
            content: it.content,
            blogId: it.blogId,
            parentId: it.parentId,
            userReplied: root.user?.name ?? root.user?.email ?? 'anonymous',
            user: {
              id: it.userId,
              name: it.user?.name ?? it.user?.email ?? 'anonymous',
              email: it.user?.email ?? 'anonymous',
            },
          })),
        }));

        const comments: PublicComment[] = allCommentsRaw.map((cm) => ({
          id: cm.id,
          createdAt: cm.createdAt,
          content: cm.content,
          blogId: cm.blogId,
          parentId: cm.parentId,
          children: cm.children,
          user: {
            id: cm.userId,
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
