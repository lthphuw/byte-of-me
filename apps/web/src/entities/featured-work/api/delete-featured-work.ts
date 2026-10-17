'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { CACHE_TAGS } from '@byte-of-me/api-core';
import { idSchema, parseInput } from '@byte-of-me/api-core/server';
import { type FeaturedWork, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function deleteFeaturedWork(
  id: string
): Promise<ApiResponse<FeaturedWork>> {
  const user = await requireAdmin();

  try {
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
