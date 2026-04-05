'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { ApiActionResponse } from '@/types/api/api-action.type';
import { PaginatedData } from '@/types/api/paginated.type';
import { requireUser } from '@/lib/auth/session';

import { Prisma } from '../../../../../../../packages/db/generated/prisma/client';

export type BlogDetails = Prisma.BlogGetPayload<{
  include: {
    coverImage: true;
    translations: true;
    project: {
      include: {
        translations: true;
      };
    };
    tags: {
      include: {
        tag: {
          include: {
            translations: true;
          };
        };
      };
    };
  };
}>;

export async function getPaginatedBlog(
  page: number,
  limit: number
): Promise<ApiActionResponse<PaginatedData<BlogDetails>>> {
  try {
    const session = await requireUser();
    const userId = session.id;
    const skip = (page - 1) * limit;

    const [items, count] = await Promise.all([
      prisma.blog.findMany({
        where: { userId },
        include: {
          coverImage: true,
          translations: true,
          project: {
            include: {
              translations: true,
            },
          },
          tags: {
            include: {
              tag: {
                include: {
                  translations: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
      }),
      prisma.blog.count({
        where: { userId: userId },
      }),
    ]);

    return {
      success: true,
      data: {
        data: items,
        meta: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalCount: count,
          hasMore: page === Math.ceil(count / limit),
        },
      },
    };
  } catch (e: any) {
    logger.error(`Get paginated blogs error: ${e.message}`);
    return {
      success: false,
      errorMsg: e.message,
    };
  }
}
