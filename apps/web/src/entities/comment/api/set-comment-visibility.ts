'use server';

import { type Comment, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function setCommentVisibility(
  commentId: string,
  hidden: boolean
): Promise<ApiResponse<Comment>> {
  try {
    await requireAdmin();

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { isDeleted: hidden },
    });

    revalidateTag(CACHE_TAGS.COMMENT, 'max');

    return { success: true, data: comment };
  } catch (error) {
    const errorMsg = getErrorMessage(
      error,
      'Failed to update comment visibility'
    );
    logger.error(`Set comment visibility error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
