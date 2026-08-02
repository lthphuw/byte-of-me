'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Hard delete. Descendants, links and label joins go with it through the
 * database cascade — the caller is responsible for having confirmed the exact
 * descendant count with the author first.
 *
 * See `create-note.ts` for why no note action calls `revalidateTag`.
 */
export async function deleteNote(id: string): Promise<ApiResponse<null>> {
  const session = await requireAdmin();

  const parsedId = parseInput(idSchema, id);
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  try {
    const { count } = await prisma.note.deleteMany({
      where: { id: parsedId.data, ownerId: session.id },
    });

    // `count` is 0 for both "no such note" and "belongs to another owner" —
    // the `ownerId` filter already prevents a cross-owner delete either way,
    // and the response deliberately doesn't distinguish the two, matching
    // `moveNote`.
    if (count === 0) {
      return { success: false, errorMsg: 'Note not found' };
    }

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to delete note');
    logger.error(`Delete note error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
