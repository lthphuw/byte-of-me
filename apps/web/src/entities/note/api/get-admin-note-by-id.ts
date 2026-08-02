'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { NoteDetail } from '@/entities/note/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * The editor's source of truth. `getNoteTree` deliberately drops `content`, so
 * the editor loads the document here rather than reusing a tree row — reusing
 * it is exactly how an empty `content` would overwrite a written note on the
 * next autosave.
 */
export async function getAdminNoteById(
  id: string
): Promise<ApiResponse<NoteDetail>> {
  const session = await requireAdmin();

  const parsedId = parseInput(idSchema, id);
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  try {
    const note = await prisma.note.findFirstOrThrow({
      where: { id: parsedId.data, ownerId: session.id },
      select: {
        id: true,
        title: true,
        content: true,
        parentId: true,
        position: true,
        isPinned: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { success: true, data: note };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load note');
    logger.error(`Get admin note by id error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
