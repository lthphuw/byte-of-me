'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { richTextToPlainText } from '@byte-of-me/ui/lib/rich-text-content';

import {
  type BatchJobInput,
  type BatchJobProgress,
  clampBatchLimit,
  noteBatchScope,
} from '@/entities/note/model/maintenance';
import { stripStoredPresentation } from '@/entities/note/model/note-presentation';
import { batchJobSchema } from '@/entities/note/model/note-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Remove pasted presentation from stored documents, one bounded batch per call.
 *
 * The paste path stops new colour from arriving (`stripPastedPresentation`, run
 * from `transformPastedHTML`), but it can do nothing for notes pasted into
 * before it landed: those still hold `textStyle`/`color` marks, highlight
 * backgrounds, `colwidth` copied out of a source `<colgroup>` and foreign link
 * classes, and the symptom is a table whose text is the source's blue on a dark
 * note. `note-presentation.ts` documents exactly what goes and what stays.
 *
 * **This is the one maintenance job that is not a repair.** The other two
 * recompute derived data from the document, so the worst they can do is write
 * what was already there; this one edits the source of truth, and it cannot
 * distinguish colour the author applied on purpose from colour that arrived by
 * paste — after the fact they are the same mark. There is no undo. The panel
 * states that before the button is pressed.
 *
 * `plainText` is re-derived on every row this writes, the way
 * `relabelInboundNoteLinks` does. Removing marks does not change any text, so
 * in practice it lands identical — but `content` and `plainText` are written by
 * the same statement everywhere else in this slice, and a write path that
 * touches one without the other is how the two drift. `searchVector` is never
 * named: it is generated in SQL from `title` and `plain_text` and regenerates
 * on this update by itself.
 *
 * The `NoteLink` rows are deliberately left alone, for the reason
 * `relabelInboundNoteLinks` gives. This strip nulls a link mark's `class` and
 * never touches its `href`, so every (sourceId, targetId) pair is identical
 * before and after; a rebuild would take locks and WAL on the one table to
 * arrive back at the rows it started with.
 *
 * See `create-note.ts` for why no note action calls `revalidateTag`.
 */
export async function stripNotePresentation(
  input: BatchJobInput
): Promise<ApiResponse<BatchJobProgress>> {
  const session = await requireAdmin();

  const parsed = parseInput(batchJobSchema, input);
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }
  const limit = clampBatchLimit(parsed.data.limit);
  const cursor = parsed.data.cursor ?? null;

  try {
    const where = noteBatchScope(session.id);

    const [total, rows] = await Promise.all([
      // Counted per call rather than latched: the client hands back a cursor
      // and nothing else, so there is nowhere to keep it. It is the size of the
      // scope, not a countdown.
      prisma.note.count({ where }),
      prisma.note.findMany({
        where,
        // The document, and nothing else. `plainText` is not read because it is
        // re-derived rather than compared — see the header.
        select: { id: true, content: true },
        // Ascending `id`: total, and stable under this job's own writes. Paging
        // by `updatedAt` would reorder the corpus behind the cursor on every
        // row rewritten, and the next batch would step over whatever moved.
        orderBy: { id: 'asc' },
        // The `limit + 1` probe: one extra row answers "is there another page"
        // without a second count per call.
        take: limit + 1,
        // `skip: 1` makes the cursor exclusive; without it every batch
        // reprocesses its predecessor's last note.
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
    ]);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    // Write only what actually differs. Beyond saving a write, `updatedAt` is
    // `@updatedAt` and the explorer's default order is "recently updated": a
    // job that rewrote every document would stamp the whole vault within
    // seconds of itself and destroy that ordering permanently — on a run whose
    // whole point is that most notes have nothing to strip.
    const updates = [];
    for (const note of page) {
      const stripped = stripStoredPresentation(note.content);
      if (stripped.changed === 0) continue;

      // `updateMany` rather than `update`, for the reason `updateNote` gives:
      // it takes a full `where`, so ownership is enforced by the same statement
      // that writes. The ids came from an owner-scoped read, so this is defence
      // in depth — which is exactly when the cheap version is worth keeping.
      updates.push(
        prisma.note.updateMany({
          where: { id: note.id, ownerId: session.id },
          data: {
            content: stripped.content,
            plainText: richTextToPlainText(stripped.content),
          },
        })
      );
    }

    // One transaction for the batch: a failure partway leaves every note in it
    // with the document it had, so the cursor the client retries from still
    // means what it says.
    if (updates.length) await prisma.$transaction(updates);

    return {
      success: true,
      data: {
        total,
        processed: page.length,
        changed: updates.length,
        nextCursor:
          hasMore && page.length ? (page[page.length - 1]?.id ?? null) : null,
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(
      error,
      'Failed to clear pasted formatting'
    );
    logger.error(`Strip note presentation error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
