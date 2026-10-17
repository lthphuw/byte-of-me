'use server';

import type {
  ApiResponse,
  PaginatedData,
  PaginatedParams,
} from '@byte-of-me/api-core';
import { buildPaginatedMeta, clampPagination } from '@byte-of-me/api-core';
import { parseInput } from '@byte-of-me/api-core/server';
import { publicCommentsParamsSchema } from '@byte-of-me/contracts/comment';
import { prisma } from '@byte-of-me/db';

import type { PublicComment } from '@/entities/comment/model';
import { handlePublicAction, withPublicActionHandler } from '@/shared/api';

/**
 * Ceilings on the reply fan-out under one page of roots. A signed-in visitor
 * can post a deep or wide subtree, and every anonymous page view would load
 * all of it; past these the thread is cut off, oldest replies first kept.
 */
const MAX_REPLIES_PER_LEVEL = 250;
const MAX_REPLIES_PER_PAGE = 500;

type GetPaginatedPublicCommentsForBlog = PaginatedParams & {
  blogId: string;
};

export async function getPaginatedPublicCommentsForBlog(
  params: GetPaginatedPublicCommentsForBlog
): Promise<ApiResponse<PaginatedData<PublicComment>>> {
  const parsed = parseInput(
    publicCommentsParamsSchema,
    params,
    'getPaginatedPublicCommentsForBlog'
  );
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }
  const { blogId } = parsed.data;

  return handlePublicAction('getPaginatedPublicCommentsForBlog', async () => {
    return await withPublicActionHandler(
      'getPaginatedPublicCommentsForBlog',
      async () => {
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

        // Replies nest arbitrarily deep, so walk level by level, only under this page's roots.
        // MAX_DEPTH bounds the query count and any cycle a corrupt parentId chain could create; the
        // two reply ceilings bound rows per query and per page.
        const MAX_DEPTH = 20;
        const descendants: (typeof roots)[number][] = [];
        let parentIds = rootIds;
        for (
          let depth = 0;
          depth < MAX_DEPTH &&
          parentIds.length > 0 &&
          descendants.length < MAX_REPLIES_PER_PAGE;
          depth++
        ) {
          const level = await prisma.comment.findMany({
            where: {
              blogId,
              isDeleted: false,
              parentId: { in: parentIds },
            },
            orderBy: { updatedAt: 'asc' },
            take: Math.min(
              MAX_REPLIES_PER_LEVEL,
              MAX_REPLIES_PER_PAGE - descendants.length
            ),
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
        // Uncached on purpose: comment mutations revalidate COMMENT with the `'max'` profile
        // (stale-while-revalidate) and the client refetches right after, so a cached copy could
        // drop the new comment. The reply ceilings above bound the cost instead.
        cache: false,
      }
    );
  });
}
