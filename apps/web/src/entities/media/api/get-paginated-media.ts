'use server';

import { Media } from '@/entities/media/model/types';
import { requireUser } from '@/features/auth/lib/session';
import { ApiResponse } from '@/shared/types/api/api-response.type';
import {
  PaginatedData,
  PaginatedParams,
} from '@/shared/types/api/paginated-api.type';
import { prisma } from '@byte-of-me/db';

export async function getPaginatedMedia(
  pagination: PaginatedParams
): Promise<ApiResponse<PaginatedData<Media>>> {
  try {
    const session = await requireUser();
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [items, totalCount] = await Promise.all([
      prisma.media.findMany({
        where: { userId: session.id },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limit,
      }),
      prisma.media.count({
        where: { userId: session.id },
      }),
    ]);

    return {
      success: true,
      data: {
        data: items.map((it) => ({
          id: it.id,
          createdAt: it.createdAt,
          updatedAt: it.updatedAt,
          fileName: it.fileName,
          fileKey: it.fileKey,
          mimeType: it.mimeType,
          size: it.size,
          provider: it.provider,
          bucket: it.bucket,
          url: it.url,
        })),
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
      errorMsg: error.message || 'Failed to fetch media',
    };
  }
}
