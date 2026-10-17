'use server';

import type { ApiResponse, PaginatedData } from '@byte-of-me/api-core';
import { buildPaginatedMeta, clampPagination } from '@byte-of-me/api-core';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { AdminCompanyListItem } from '@/entities/company/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function getPaginatedAdminCompanies(
  rawPage: number = 1,
  rawLimit: number = 20
): Promise<ApiResponse<PaginatedData<AdminCompanyListItem>>> {
  const user = await requireAdmin();

  try {
    const userId = user.id;
    const { page, limit } = clampPagination(
      { page: rawPage, limit: rawLimit },
      { defaultLimit: 20 }
    );
    const skip = (page - 1) * limit;

    const [items, totalCount] = await Promise.all([
      prisma.company.findMany({
        where: { userId },
        // Narrowed to what the card renders. Roles, tasks and translations
        // the editor needs come from `getAdminCompanyById`, so a row here must
        // never be handed to the dialog as `initialData`.
        include: {
          logo: { select: { url: true } },
          _count: { select: { roles: true, techStacks: true } },
        },
        // `startDate` is not unique; `id` keeps `skip`/`take` from repeating a
        // row across pages.
        orderBy: [{ startDate: 'desc' }, { id: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.company.count({ where: { userId } }),
    ]);

    return {
      success: true,
      data: {
        data: items,
        meta: buildPaginatedMeta({ page, limit, totalCount }),
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to fetch companies');
    logger.error(`Get paginated admin companies error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
