'use server';

import type { ApiResponse, PaginatedData } from '@byte-of-me/api-core';
import { buildPaginatedMeta, clampPagination } from '@byte-of-me/api-core';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminBlogListItem } from '@/entities/blog';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function getPaginatedAdminBlogs(
  rawPage: number,
  rawLimit: number
): Promise<ApiResponse<PaginatedData<AdminBlogListItem>>> {
  const session = await requireAdmin();
  const userId = session.id;

  try {
    const { page, limit } = clampPagination(
      { page: rawPage, limit: rawLimit },
      { defaultLimit: 20 }
    );
    const skip = (page - 1) * limit;

    const [items, count] = await Promise.all([
      prisma.blog.findMany({
        where: { userId },
        include: {
          coverImage: true,
          // Narrowed to what blog-editor-card.tsx renders: never `content` (a whole TipTap document
          // per translation); the editor dialog fetches the full row via getAdminBlogById.
          translations: {
            select: {
              id: true,
              language: true,
              title: true,
              description: true,
            },
          },
          // Narrowed like `translations` above: a full include pulls every locale's `@db.Text`
          // project description, while the card and editor read only the title and the tag name.
          project: {
            include: {
              translations: {
                select: { id: true, language: true, title: true },
              },
            },
          },
          tags: {
            include: {
              tag: {
                include: {
                  translations: {
                    select: { id: true, language: true, name: true },
                  },
                },
              },
            },
          },
        },
        // Postgres gives no order without one, so `skip`/`take` could repeat a
        // row on one page and drop it from the next. `id` breaks ties because
        // `publishedDate` is nullable and not unique.
        orderBy: [{ publishedDate: 'desc' }, { id: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.blog.count({
        where: { userId },
      }),
    ]);

    return {
      success: true,
      data: {
        data: items,
        meta: buildPaginatedMeta({ page, limit, totalCount: count }),
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error(`Get paginated blogs error: ${errorMsg}`);
    return {
      success: false,
      errorMsg,
    };
  }
}
