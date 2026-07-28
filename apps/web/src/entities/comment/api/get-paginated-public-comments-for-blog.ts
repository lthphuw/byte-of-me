'use server';

import { prisma } from '@byte-of-me/db';

import type { PublicComment } from '@/entities/comment/model';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';
import { buildPaginatedMeta, clampPagination } from '@/shared/lib/pagination';
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
        const { blogId } = params;
        const { page, limit } = clampPagination(params, { defaultLimit: 8 });
        const skip = (page - 1) * limit;

        const rootWhere = {
          blogId,
          parentId: null,
          isDeleted: false,
        };

        // Only the fields the public payload below exposes — never full user
        // rows (emails etc.).
        const commentSelect = {
          id: true,
          createdAt: true,
          content: true,
          blogId: true,
          parentId: true,
          userId: true,
          user: { select: { name: true } },
        } as const;

        const [roots, count] = await Promise.all([
          prisma.comment.findMany({
            where: rootWhere,
            select: commentSelect,
            orderBy: { updatedAt: 'desc' },
            take: limit,
            skip,
          }),
          prisma.comment.count({ where: rootWhere }),
        ]);

        const rootIds = roots.map((c) => c.id);

        // Replies can nest arbitrarily deep, so walk the thread level by
        // level — but only under this page's roots, never the blog's whole
        // reply table. MAX_DEPTH bounds both the query count and any cycle a
        // corrupt parentId chain could create.
        const MAX_DEPTH = 20;
        const descendants: (typeof roots)[number][] = [];
        let parentIds = rootIds;
        for (let depth = 0; depth < MAX_DEPTH && parentIds.length > 0; depth++) {
          const level = await prisma.comment.findMany({
            where: {
              blogId,
              isDeleted: false,
              parentId: { in: parentIds },
            },
            orderBy: { updatedAt: 'asc' },
            select: commentSelect,
          });
          descendants.push(...level);
          parentIds = level.map((c) => c.id);
        }

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

        // Never expose commenter email addresses in the public payload.
        const allCommentsRaw = roots.map((root) => ({
          ...root,
          children: collectDescendants(root.id).map((it) => ({
            id: it.id,
            createdAt: it.createdAt,
            content: it.content,
            blogId: it.blogId,
            parentId: it.parentId,
            userReplied: root.user?.name ?? 'Anonymous',
            user: {
              id: it.userId,
              name: it.user?.name ?? 'Anonymous',
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
            name: cm.user?.name ?? 'Anonymous',
          },
        }));

        return {
          data: comments,
          meta: buildPaginatedMeta({ page, limit, totalCount: count }),
        };
      },
      {
        cache: false,
      }
    );
  });
}
