'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { collectDescendantIds } from '@/entities/note/model/note-tree';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** Reverses `archiveNote` over the same set. See `create-note.ts` re: caching. */
export async function restoreNote(id: string): Promise<ApiResponse<null>> {
  const session = await requireAdmin();

  const parsedId = parseInput(idSchema, id);
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  try {
    const rows = await prisma.note.findMany({
      where: { ownerId: session.id },
      select: { id: true, parentId: true },
    });

    // See `archive-note.ts`: the write below covers the note and its
    // descendants, so its count can't signal a miss on the target alone.
    // `rows` already holds every note this owner has.
    if (!rows.some((row) => row.id === parsedId.data)) {
      return { success: false, errorMsg: 'Note not found' };
    }

    const ids = [parsedId.data, ...collectDescendantIds(rows, parsedId.data)];

    await prisma.note.updateMany({
      where: { id: { in: ids }, ownerId: session.id },
      data: { archivedAt: null },
    });

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to restore note');
    logger.error(`Restore note error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
