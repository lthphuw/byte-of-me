'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminEducationListItem } from '@/entities/education/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { buildPaginatedMeta, clampPagination } from '@/shared/lib/pagination';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

export async function getPaginatedAdminEducations(
  rawPage: number = 1,
  rawLimit: number = 20
): Promise<ApiResponse<PaginatedData<AdminEducationListItem>>> {
  try {
    const session = await requireAdmin();
    const userId = session.id;
    const { page, limit } = clampPagination(
      { page: rawPage, limit: rawLimit },
      { defaultLimit: 20 }
    );
    const skip = (page - 1) * limit;

    const [items, totalCount] = await Promise.all([
      prisma.education.findMany({
        where: { userId },
        // Narrowed to what the card renders. The achievement bodies and
        // images the editor needs come from `getAdminEducationById`, so a row
        // here must never be handed to the dialog as `initialData`.
        include: {
          logo: { select: { url: true } },
          // Every save rewrites translations with `deleteMany` + `create`, so
          // physical row order changes each time; sort so the fallback
          // language resolves the same way on every read.
          translations: {
            select: { id: true, language: true, title: true },
            orderBy: { language: 'asc' },
          },
          _count: { select: { achievements: true } },
        },
        // `sortOrder` is not editable and sits at 0 for every row, so without
        // the tiebreakers `skip`/`take` could repeat a row across pages.
        orderBy: [{ sortOrder: 'desc' }, { startDate: 'desc' }, { id: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.education.count({ where: { userId } }),
    ]);

    return {
      success: true,
      data: {
        data: items,
        meta: buildPaginatedMeta({ page, limit, totalCount }),
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to fetch educations');
    logger.error(`Get paginated admin educations error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
