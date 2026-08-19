'use server';

import { type Prisma, prisma } from '@byte-of-me/db';
import { renderRichTextHtml } from '@byte-of-me/ui/rich-text-render';

import type { AdminContactMessage } from '@/entities/contact-message';
import { requireAdmin } from '@/shared/lib/auth';
import { buildPaginatedMeta, clampPagination } from '@/shared/lib/pagination';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

/**
 * A stored message plus its rendered markup. The gallery is a client widget,
 * so it must not import the tiptap render schema (`generateHTML` + the full
 * extension set + lowlight ≈ 1 MB) to print a card — same split as
 * `PublicProject.descriptionHtml`. The raw `message` is kept for search and
 * for anything that needs the source document.
 */
export type AdminContactMessageWithHtml = AdminContactMessage & {
  messageHtml: string;
};

export async function getPaginatedContactMessages(
  rawPage: number = 1,
  rawLimit: number = 20,
  filter?: {
    search?: string;
  }
): Promise<ApiResponse<PaginatedData<AdminContactMessageWithHtml>>> {
  try {
    const session = await requireAdmin();
    const { page, limit } = clampPagination(
      { page: rawPage, limit: rawLimit },
      { defaultLimit: 20 }
    );
    const skip = (page - 1) * limit;

    const where: Prisma.ContactMessageWhereInput = {
      userId: session.id,
      ...(filter?.search && {
        OR: [
          {
            email: {
              contains: filter.search,
              mode: 'insensitive',
            },
          },
          {
            name: {
              contains: filter.search,
              mode: 'insensitive',
            },
          },
          {
            message: {
              contains: filter.search,
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    const [items, totalCount] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.contactMessage.count({ where }),
    ]);

    return {
      success: true,
      data: {
        data: items.map((item) => ({
          ...item,
          messageHtml: renderRichTextHtml(item.message),
        })),
        meta: buildPaginatedMeta({ page, limit, totalCount }),
      },
    };
  } catch (error) {
    return {
      success: false,
      errorMsg: getErrorMessage(error, 'Failed to fetch contact'),
    };
  }
}
