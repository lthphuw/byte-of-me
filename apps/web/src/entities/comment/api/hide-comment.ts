'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { getAuthenticatedAdmin, requireUser } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * The author may hide their own comment and the site owner may hide any. The
 * admin test is `getAuthenticatedAdmin()`, not `user.role`: a bare role check
 * would admit any future ADMIN-role row (see `session.ts`).
 */
export async function hideComment(
  commentId: string
): Promise<ApiResponse<null>> {
  const user = await requireUser();

  try {
    const parsedId = parseInput(idSchema, commentId, 'hideComment');
    if (!parsedId.ok) {
      return { success: false, errorMsg: parsedId.errorMsg };
    }

    const isAdmin = (await getAuthenticatedAdmin()) !== null;

    // One conditional write: the ownership test and the update cannot disagree.
    // Zero rows means the comment is not the caller's and the caller is not the
    // owner (or the comment does not exist).
    const { count } = await prisma.comment.updateMany({
      where: isAdmin
        ? { id: parsedId.data }
        : { id: parsedId.data, userId: user.id },
      data: { isDeleted: true },
    });
    if (count === 0) {
      // Zero rows is either a missing comment or someone else's, so look it up
      // before naming the refusal.
      const exists = await prisma.comment.findUnique({
        where: { id: parsedId.data },
        select: { id: true },
      });
      return exists
        ? { success: false, errorMsg: 'Forbidden', errorCode: 'forbidden' }
        : { success: false, errorMsg: 'Comment not found', errorCode: 'not-found' };
    }

    revalidateTag(CACHE_TAGS.COMMENT, 'max');

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to hide comment');
    logger.error(`[Comment] hide: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
