'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function deleteTag(id: string): Promise<ApiResponse<null>> {
  try {
    await requireAdmin();

    await prisma.tag.delete({
      where: { id },
    });

    revalidateTag(CACHE_TAGS.TAG, 'max');

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error(`[Tag] delete: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
