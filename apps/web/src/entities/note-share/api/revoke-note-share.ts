'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Withdraw one grant.
 *
 * A hard delete, not a `revokedAt` flag. A soft-delete column would add a
 * filter that every permission query has to remember, and forgetting it once
 * resurrects access that was deliberately withdrawn.
 */
export async function revokeNoteShare(
  shareId: string
): Promise<ApiResponse<null>> {
  const session = await requireAdmin();

  const parsedId = parseInput(idSchema, shareId);
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  try {
    const { count } = await prisma.noteShare.deleteMany({
      where: { id: parsedId.data, note: { ownerId: session.id } },
    });

    // `count` is 0 for both "no such share" and "belongs to another owner" —
    // the relation filter already prevents a cross-owner revoke either way,
    // and the response deliberately does not distinguish the two, matching
    // `deleteNote`.
    if (count === 0) {
      return { success: false, errorMsg: 'Share not found' };
    }

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to remove access');
    logger.error(`Revoke note share error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
