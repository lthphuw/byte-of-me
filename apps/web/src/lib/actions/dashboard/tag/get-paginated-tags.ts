'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { Prisma } from '../../../../../../../packages/db/generated/prisma/client';

import { ApiActionResponse } from '@/types/api/api-action.type';
import { PaginatedData } from '@/types/api/paginated.type';
import { requireUser } from '@/lib/auth/session';





export type TagDetails = Prisma.TagGetPayload<{
  include: {
    translations: true;

  };
}>;

export async function getPaginatedTags(
  page: number = 1,
  limit: number = 20
): Promise<ApiActionResponse<PaginatedData<TagDetails>>> {
  try {

    const user = await requireUser();

    const skip = (page - 1) * limit;
    const [tags, totalCount] = await Promise.all([
      prisma.tag.findMany({
        include: {
          translations: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limit,
      }),
      prisma.tag.count({}),
    ]);

    return {
      success: true,
      data: {
        data: tags,
        meta: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasMore: skip + tags.length < totalCount,
        }
      },
    };
  } catch (e: any) {
    logger.error(`[Service Error] getTagDetails: ${e.message}`);
    return {
      success: false,
      errorMsg: e.message,
    };
  }
}
