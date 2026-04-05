'use server';

import { Media } from '@/models/media';
import { prisma } from '@byte-of-me/db';

import { ApiActionResponse } from '@/types/api/api-action.type';
import { PaginatedData } from '@/types/api/paginated.type';
import { requireUser } from '@/lib/auth/session';





export async function getPaginatedMedia(
  page: number = 1,
  limit: number = 20
): Promise<ApiActionResponse<PaginatedData<Media>>> {

  try {
    const session = await requireUser();
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
