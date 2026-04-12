'use server';

import { prisma } from '@byte-of-me/db';

import type { AdminContactMessage } from '@/entities/contact-message';
import { requireUser } from '@/features/auth/lib/session';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

import type { Prisma } from '../../../../../../packages/db/generated/prisma/client';

export async function getPaginatedContactMessages(
  page: number = 1,
  limit: number = 20,
  filter?: {
    search?: string;
  }
): Promise<ApiResponse<PaginatedData<AdminContactMessage>>> {
  try {
    const session = await requireUser();
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
        data: items,
        meta: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasMore: skip + items.length < totalCount,
        },
      },
    };
  } catch (error: any) {
    return {
      success: false,
      errorMsg: error.message || 'Failed to fetch contact',
    };
  }
}
