'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { requireUser } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function hideComment(
  commentId: string
): Promise<ApiResponse<null>> {
  try {
    const user = await requireUser();

    const parsedId = parseInput(idSchema, commentId);
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }

    await prisma.comment.update({
      where: {
        id: commentId,
        userId: user.id,
      },
      data: {
        isDeleted: true,
      },
    });

    revalidateTag(CACHE_TAGS.COMMENT, 'max');

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to hide comment');
    logger.error(`[Comment] hide: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
