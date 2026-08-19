'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminBlogListItem } from '@/entities/blog';
import { requireAdmin } from '@/shared/lib/auth';
import { buildPaginatedMeta, clampPagination } from '@/shared/lib/pagination';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

export async function getPaginatedAdminBlogs(
  rawPage: number,
  rawLimit: number
): Promise<ApiResponse<PaginatedData<AdminBlogListItem>>> {
  try {
    const session = await requireAdmin();
    const userId = session.id;
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
          // Narrowed to what blog-editor-card.tsx renders: never `content`
          // (a whole TipTap document per translation). The editor dialog
          // fetches the full row on demand via getAdminBlogById instead of
          // reusing this list item.
          translations: {
            select: {
              id: true,
              language: true,
              title: true,
              description: true,
            },
          },
          // Narrowed for the same reason as `translations` above: a full
          // include pulls every locale's `ProjectTranslation.description`,
          // which is `@db.Text`. The card renders only the tag name; nothing
          // in the admin list or the editor form reads a project translation
          // beyond its title.
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
