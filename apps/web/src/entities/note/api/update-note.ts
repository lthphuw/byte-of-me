'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { richTextToPlainText } from '@byte-of-me/ui/lib/rich-text-content';

import {
  type UpdateNoteInput,
  updateNoteSchema,
} from '@/entities/note/model/note-schema';
import type { NoteDetail } from '@/entities/note/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** See `create-note.ts` for why no note action calls `revalidateTag`. */
export async function updateNote(
  input: UpdateNoteInput
): Promise<ApiResponse<NoteDetail>> {
  const session = await requireAdmin();

  const parsed = parseInput(updateNoteSchema, input);
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }
  const { id, title, content } = parsed.data;

  try {
    // `updateMany` rather than `update`: it takes a full `where`, so ownership
    // is enforced by the same statement that writes. `update` only accepts a
    // unique selector, which would mean reading first and trusting the gap.
    await prisma.note.updateMany({
      where: { id, ownerId: session.id },
      data: {
        ...(title === undefined ? {} : { title }),
        // `plainText` is always derived here and never accepted from the
        // client, so the search index cannot drift from the document.
        ...(content === undefined
          ? {}
          : { content, plainText: richTextToPlainText(content) }),
      },
    });

    const note = await prisma.note.findFirstOrThrow({
      where: { id, ownerId: session.id },
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
    const errorMsg = getErrorMessage(error, 'Failed to save note');
    logger.error(`Update note error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
