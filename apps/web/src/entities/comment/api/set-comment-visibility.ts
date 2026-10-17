'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { CACHE_TAGS } from '@byte-of-me/api-core';
import { idSchema, parseInput } from '@byte-of-me/api-core/server';
import { type Comment, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function setCommentVisibility(
  commentId: string,
  hidden: boolean
): Promise<ApiResponse<Comment>> {
  await requireAdmin();

  try {
    const parsedId = parseInput(idSchema, commentId, 'setCommentVisibility');
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }

    const parsedHidden = parseInput(z.boolean(), hidden, 'setCommentVisibility');
    if (!parsedHidden.ok) {
      return { success: false, errorMsg: parsedHidden.errorMsg };
    }

    const comment = await prisma.comment.update({
      where: { id: parsedId.data },
      data: { isDeleted: parsedHidden.data },
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
