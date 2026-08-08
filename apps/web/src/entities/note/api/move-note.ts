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
  const { id, parentId, position, acknowledgeSharedDestination } = parsed.data;

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

    // Moving INTO a shared subtree grants access to everyone who can already
    // open the destination. That IS the correct semantics — it is the same
    // property that makes moving OUT revoke access with nothing to clean up —
    // but it is silent, and a mis-drop is the likeliest way a note leaks.
    //
    // Checked here as well as in the explorer's confirmation because a server
    // action is an addressable endpoint that never renders that dialog
    // (AGENTS §5). `LIMIT 1`: this only needs to know WHETHER anyone is
    // affected; `getMoveShareExposure` is what tells the dialog who.
    if (parentId !== null && !acknowledgeSharedDestination) {
      const exposed = await prisma.$queryRaw<{ email: string }[]>`
        WITH RECURSIVE chain AS (
          SELECT n.id, n.parent_id, n.owner_id
          FROM notes n
          WHERE n.id = ${parentId} AND n.owner_id = ${session.id}
          UNION ALL
          SELECT p.id, p.parent_id, p.owner_id
          FROM chain c
          JOIN notes p ON p.id = c.parent_id AND p.owner_id = c.owner_id
        )
        SELECT s.email
        FROM chain c
        JOIN note_shares s ON s.note_id = c.id
        LIMIT 1
      `;

      if (exposed.length > 0) {
        return {
          success: false,
          errorMsg: 'Destination is shared; confirm before moving',
        };
      }
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
