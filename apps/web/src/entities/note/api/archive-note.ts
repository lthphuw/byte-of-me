'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { collectDescendantIds } from '@/entities/note/model/note-tree';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Soft delete. Archiving a parent must take its descendants with it — leaving
 * them behind orphans them in the sidebar, visible with no route back to their
 * parent. `restoreNote` reverses exactly this set.
 *
 * See `create-note.ts` for why no note action calls `revalidateTag`.
 */
export async function archiveNote(id: string): Promise<ApiResponse<null>> {
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

    // The write below targets the note *and* its descendants, so its count
    // is never a reliable "did the target exist" signal. `rows` already
    // holds every note this owner has — checking membership here re-uses
    // that fetch instead of adding a second query, and treats "no such
    // note" and "belongs to another owner" identically, matching how
    // `moveNote` reports a miss.
    if (!rows.some((row) => row.id === parsedId.data)) {
      return { success: false, errorMsg: 'Note not found' };
    }

    const ids = [parsedId.data, ...collectDescendantIds(rows, parsedId.data)];

    await prisma.note.updateMany({
      where: { id: { in: ids }, ownerId: session.id },
      data: { archivedAt: new Date() },
    });

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to archive note');
    logger.error(`Archive note error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
