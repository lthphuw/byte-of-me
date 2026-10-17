'use server';

import type {
  ApiResponse,
  PaginatedData,
  PaginatedParams,
} from '@byte-of-me/api-core';
import { buildPaginatedMeta, clampPagination } from '@byte-of-me/api-core';
import { prisma } from '@byte-of-me/db';

import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { Media } from '@/shared/types/models';

export async function getPaginatedMedia(
  pagination: PaginatedParams
): Promise<ApiResponse<PaginatedData<Media>>> {
  const session = await requireAdmin();

  try {
    const { page, limit } = clampPagination(pagination, { defaultLimit: 10 });
    const skip = (page - 1) * limit;

    const [items, totalCount] = await Promise.all([
      prisma.media.findMany({
        where: { userId: session.id },
        orderBy: { createdAt: 'desc' },
        skip,
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
        meta: buildPaginatedMeta({ page, limit, totalCount }),
      },
    };
  } catch (error) {
    return {
      success: false,
      errorMsg: getErrorMessage(error, 'Failed to fetch media'),
    };
  }
}
