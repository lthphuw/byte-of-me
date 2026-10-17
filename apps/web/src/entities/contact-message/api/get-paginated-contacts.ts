'use server';

import type { ApiResponse, PaginatedData } from '@byte-of-me/api-core';
import { buildPaginatedMeta, clampPagination } from '@byte-of-me/api-core';
import { type Prisma, prisma } from '@byte-of-me/db';

import type { AdminContactMessage } from '@/entities/contact-message';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function getPaginatedContactMessages(
  rawPage: number = 1,
  rawLimit: number = 20,
  filter?: {
    search?: string;
  }
): Promise<ApiResponse<PaginatedData<AdminContactMessage>>> {
  const session = await requireAdmin();

  try {
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
        // Visitor text, sent as-is: the gallery prints it as a text node.
        data: items,
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
