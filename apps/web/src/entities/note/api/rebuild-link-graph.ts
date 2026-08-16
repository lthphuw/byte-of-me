'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import {
  type BatchJobInput,
  type BatchJobProgress,
  clampBatchLimit,
  noteBatchScope,
} from '@/entities/note/model/maintenance';
import { extractNoteLinkIds } from '@/entities/note/model/note-links';
import { batchJobSchema } from '@/entities/note/model/note-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Recompute `NoteLink` from the documents, one bounded batch per call.
 *
 * `updateNote` already rebuilds a note's links on every save, so in a vault
 * nothing has gone wrong in this job finds nothing and writes nothing. It
 * exists for the cases where that rebuild did not run: a note whose links were
 * written before `parseNoteHref` learned about locale-prefixed hrefs, a
 * document restored out of an export, a save that committed the note but not
 * the links, a target that was deleted while the source was archived. Every one
 * of those is silent — the graph page and the links panel simply draw an edge
 * that is not in the document, or fail to draw one that is.
 *
 * It never writes a `Note` row. The document is the input to this computation,
 * so a job that could also edit it would be able to launder a bug in the
 * extraction into the source of truth, and there would be nothing left to
 * recompute from. `rebuildSearchIndex` owns the one derived column on `Note`.
 */
export async function rebuildLinkGraph(
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
      // Counted on every call rather than once at the start, because there is
      // nowhere to keep it: the client hands back a cursor and nothing else.
      // It is the size of the scope, not a countdown, so it only moves if the
      // author creates or deletes a note mid-job — and then the bar telling
      // the truth about the new total beats it finishing at 103%.
      prisma.note.count({ where }),
      prisma.note.findMany({
        where,
        // The document, and nothing else. Titles, labels and timestamps are
        // not part of this derivation.
        select: { id: true, content: true },
        // Ascending `id` is the whole ordering. It is total (a primary key
        // cannot tie) and it never changes under the job, which is what makes
        // the cursor resumable — `updatedAt` would reorder the corpus behind
        // the cursor the moment a rebuild in a later batch touched a row.
        orderBy: { id: 'asc' },
        // The `limit + 1` probe `getNotesPage` uses: one extra row answers
        // "is there another page" without a second count per call.
        take: limit + 1,
        ...(cursor
          ? // `skip: 1` makes the cursor exclusive; without it every batch
            // reprocesses its predecessor's last note.
            { cursor: { id: cursor }, skip: 1 }
          : {}),
      }),
    ]);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    if (!page.length) {
      return {
        success: true,
        data: { total, processed: 0, changed: 0, nextCursor: null },
      };
    }

    // Self-links are dropped here for the reason `updateNote` gives: a note
    // listing itself under "links out" is noise, and the row is not wrong so
    // much as useless. Dropping them at extraction also keeps the comparison
    // below symmetric with what a save would have stored.
    const linkedByNote = new Map<string, string[]>();
    const candidates = new Set<string>();
    for (const note of page) {
      const linked = extractNoteLinkIds(note.content).filter(
        (targetId) => targetId !== note.id
      );
      linkedByNote.set(note.id, linked);
      for (const targetId of linked) candidates.add(targetId);
    }

    // Ownership is verified rather than trusted from the href, the same guard
    // `updateNote` applies on the way in: the href is author-supplied text
    // inside a document, so a pasted link to someone else's note id would
    // otherwise write a row pointing across owners. This also drops links to
    // notes that no longer exist at all — the row would violate the foreign
    // key, and a broken link is a reporting problem (`scanStaleNoteLinks`),
    // not something to encode as an edge.
    //
    // ONE query for the whole batch, not one per note: a densely linked page
    // of 25 notes is otherwise 25 round trips to answer a question a single
    // `in` clause answers.
    const owned = candidates.size
      ? await prisma.note.findMany({
          where: { id: { in: [...candidates] }, ownerId: session.id },
          select: { id: true },
        })
      : [];
    const ownedIds = new Set(owned.map((row) => row.id));

    // What the batch already links to — one indexed read on `sourceId`, again
    // for the whole page at once. It buys the ability to do NOTHING, which is
    // the overwhelmingly common case here: `updateNote` keeps these rows
    // correct, so a healthy vault should rewrite zero notes, and a job that
    // deleted and reinserted every note's links to discover that would take
    // locks and write WAL for the entire corpus to change nothing.
    //
    // Scoped by `sourceId` alone is safe because every id in `page` came from
    // the owner-scoped query above.
    const storedRows = await prisma.noteLink.findMany({
      where: { sourceId: { in: page.map((note) => note.id) } },
      select: { sourceId: true, targetId: true },
    });
    const storedByNote = new Map<string, string[]>();
    for (const row of storedRows) {
      const list = storedByNote.get(row.sourceId);
      if (list) list.push(row.targetId);
      else storedByNote.set(row.sourceId, [row.targetId]);
    }

    // Both sides sorted id lists, so the comparison is exact rather than
    // heuristic — same length and same members in the same order means the
    // stored edges already ARE what the document says. Copied in shape from
    // `updateNote` on purpose: two different notions of "the links changed"
    // would eventually disagree, and this job would then fight the save path,
    // rewriting on every run what the last save had just written.
    const rewrite: { sourceId: string; targetIds: string[] }[] = [];
    for (const note of page) {
      const nextIds = (linkedByNote.get(note.id) ?? [])
        .filter((targetId) => ownedIds.has(targetId))
        .sort();
      const previousIds = (storedByNote.get(note.id) ?? []).sort();
      const unchanged =
        previousIds.length === nextIds.length &&
        previousIds.every((targetId, index) => targetId === nextIds[index]);

      if (!unchanged) rewrite.push({ sourceId: note.id, targetIds: nextIds });
    }

    if (rewrite.length) {
      const nextRows = rewrite.flatMap(({ sourceId, targetIds }) =>
        targetIds.map((targetId) => ({ sourceId, targetId }))
      );

      // Rebuilt wholesale, never patched incrementally: the document is the
      // single source of truth for what it links to, and a delete-then-insert
      // of a source's own rows cannot drift from it the way a diff can.
      //
      // ONE transaction for the batch rather than one per note. It is the same
      // delete + `createMany` pair `updateNote` runs, widened by an `in`
      // clause, and it makes a batch all-or-nothing: a failure partway leaves
      // every note in it with the links it had, so the cursor the client
      // retries from is still meaningful. Per-note transactions would leave
      // the batch half-rebuilt with nothing recording where it stopped.
      await prisma.$transaction([
        prisma.noteLink.deleteMany({
          where: { sourceId: { in: rewrite.map((entry) => entry.sourceId) } },
        }),
        ...(nextRows.length
          ? [
              prisma.noteLink.createMany({
                data: nextRows,
                // `extractNoteLinkIds` already dedupes; belt and braces
                // against a future caller that does not.
                skipDuplicates: true,
              }),
            ]
          : []),
      ]);
    }

    return {
      success: true,
      data: {
        total,
        processed: page.length,
        changed: rewrite.length,
        nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to rebuild the link graph');
    logger.error(`Rebuild link graph error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
