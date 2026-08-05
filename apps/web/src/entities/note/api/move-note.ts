'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import {
  type MoveNoteInput,
  moveNoteSchema,
} from '@/entities/note/model/note-schema';
import { wouldCreateCycle } from '@/entities/note/model/note-tree';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** See `create-note.ts` for why no note action calls `revalidateTag`. */
export async function moveNote(
  input: MoveNoteInput
): Promise<ApiResponse<null>> {
  const session = await requireAdmin();

  const parsed = parseInput(moveNoteSchema, input);
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }
  const { id, parentId, position } = parsed.data;

  try {
    // The whole owner's ancestry in one query. A note under its own descendant
    // produces a subtree unreachable from any root — it disappears from the
    // sidebar with no error anywhere, which is why this is checked before the
    // write rather than repaired after it.
    const rows = await prisma.note.findMany({
      where: { ownerId: session.id },
      select: { id: true, parentId: true },
    });

    if (wouldCreateCycle(rows, id, parentId)) {
      return {
        success: false,
        errorMsg: 'A note cannot be moved inside one of its own children',
      };
    }

    // Make room first: siblings at/after the target slot shift down one, so
    // "insert before X" is deterministic instead of tying with X's position
    // and falling through to the title tiebreaker. Positions only have to
    // order, not be contiguous, so the growing gaps are harmless.
    await prisma.$transaction([
      prisma.note.updateMany({
        where: {
          ownerId: session.id,
          parentId,
          position: { gte: position },
          id: { not: id },
        },
        data: { position: { increment: 1 } },
      }),
      prisma.note.update({
        where: { id, ownerId: session.id },
        data: { parentId, position },
      }),
    ]);

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to move note');
    logger.error(`Move note error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
