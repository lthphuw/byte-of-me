'use server';

import { type FeaturedWork, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function deleteFeaturedWork(
  id: string
): Promise<ApiResponse<FeaturedWork>> {
  try {
    const user = await requireAdmin();

    const parsedId = parseInput(idSchema, id);
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }

    const existing = await prisma.featuredWork.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      return { success: false, errorMsg: 'Featured work not found' };
    }

    const featuredWork = await prisma.featuredWork.delete({ where: { id } });

    revalidateTag(CACHE_TAGS.FEATURED_WORK, 'max');

    return { success: true, data: featuredWork };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to delete featured work');
    logger.error(`Delete featured work error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
