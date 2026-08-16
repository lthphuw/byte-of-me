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
import { batchJobSchema } from '@/entities/note/model/note-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Recompute `Note.plainText` from `Note.content`, one bounded batch per call.
 *
 * `plainText` is what search reads, and `updateNote` derives it on every save
 * that carries a document — so this job is for the drift that save path cannot
 * fix by itself: rows written before `richTextToPlainText` changed, and it HAS
 * changed. Joining every level with `''` welded the last word of each block
 * onto the first word of the next (`data.Step` tokenised as one `host` token by
 * Postgres), and 300 words present in the real corpus were missing from
 * `search_vector` because of it. Fixing the function does nothing for the rows
 * already stored; only re-deriving them does, and until then those notes stay
 * unfindable with no error anywhere to say so.
 *
 * `searchVector` is never named in the write. It is a column generated in SQL
 * from `title` and `plain_text` (see the schema), so Prisma must never write
 * it — and it regenerates by itself on the update below, which is exactly why
 * rewriting `plainText` is enough to repair search.
 */
export async function rebuildSearchIndex(
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
      prisma.note.count({ where }),
      prisma.note.findMany({
        where,
        // `plainText` is selected because the comparison below is the point of
        // this job, not an optimisation of it — see the `updatedAt` argument
        // at the write.
        select: { id: true, content: true, plainText: true },
        // Ascending `id`: total, and stable under the job's own writes. Paging
        // by `updatedAt` would reorder the corpus behind the cursor on every
        // row this job touched, and the batch after that would skip whatever
        // moved past it.
        orderBy: { id: 'asc' },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
    ]);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    // Write only what actually differs, and this is load-bearing well beyond
    // saving a write. `updatedAt` is `@updatedAt`, so every row Prisma updates
    // gets a fresh timestamp — and the explorer's default order is "recently
    // updated". A job that rewrote `plainText` unconditionally would stamp the
    // entire vault within a few seconds of itself and destroy that ordering
    // permanently, turning a repair nobody could see into a loss anybody can.
    const updates = [];
    for (const note of page) {
      const plainText = richTextToPlainText(note.content);
      if (plainText === note.plainText) continue;

      // `updateMany` rather than `update`, for the reason `updateNote` gives:
      // it takes a full `where`, so ownership is enforced by the same
      // statement that writes. Ids here came from an owner-scoped read, so
      // this is defence in depth rather than the primary guard — but the
      // primary guard being upstream is exactly when the cheap one is worth
      // keeping.
      updates.push(
        prisma.note.updateMany({
          where: { id: note.id, ownerId: session.id },
          // `content` is not in this write. It is the INPUT to the
          // derivation; a job that could also rewrite the document would be
          // able to make the search index right by making the note wrong.
          data: { plainText },
        })
      );
    }

    // One transaction for the batch: a failure partway leaves every note in it
    // with the text it had, so the cursor the client retries from still means
    // what it says.
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
      'Failed to rebuild the search index'
    );
    logger.error(`Rebuild search index error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
