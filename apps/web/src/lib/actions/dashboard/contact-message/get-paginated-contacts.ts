'use server';

import { connection } from 'next/server';
import { prisma } from '@byte-of-me/db';
import { Prisma } from '../../../../../../../packages/db/generated/prisma/client';

import { ApiActionResponse } from '@/types/api/api-action.type';
import { PaginatedData } from '@/types/api/paginated.type';
import { requireUser } from '@/lib/auth/session';

export type ContactMessage = Prisma.ContactMessageGetPayload<{}>;

export async function getPaginatedContactMessages(
  page: number = 1,
  limit: number = 20,
  filter?: {
    search?: string;
  }
): Promise<ApiActionResponse<PaginatedData<ContactMessage>>> {

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
