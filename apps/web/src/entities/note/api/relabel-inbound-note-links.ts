'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { richTextToPlainText } from '@byte-of-me/ui/lib/rich-text-content';

import { relabelNoteLinks } from '@/entities/note/model/note-links';
import {
  type RelabelInboundNoteLinksInput,
  relabelInboundNoteLinksSchema,
} from '@/entities/note/model/note-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Notes rewritten per transaction.
 *
 * A rename fires this from the editor's own save path, so it competes with
 * the author's next keystroke. One transaction holding a row lock on every
 * inbound source at once would be the worst shape available: a hub note with
 * hundreds of backlinks would block its own workspace on a cosmetic edit, and
 * `$transaction` builds and awaits the whole array before yielding, so the
 * Node event loop serving the rest of this request gets nothing until it is
 * done. Fifty keeps each transaction short and, because the chunks are
 * awaited one at a time, hands the loop back between them.
 *
 * Chunking does mean the rewrite is not atomic across the whole set. That is
 * acceptable here and would not be for a link-graph edit: a half-applied run
 * leaves some anchors reading the old title, which is exactly the state the
 * feature exists to clean up and is fixed by running it again.
 */
const WRITE_CHUNK_SIZE = 50;

/** See `create-note.ts` for why no note action calls `revalidateTag`. */
export async function relabelInboundNoteLinks(
  input: RelabelInboundNoteLinksInput
): Promise<ApiResponse<{ notes: number; links: number }>> {
  const session = await requireAdmin();

  const parsed = parseInput(relabelInboundNoteLinksSchema, input);
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }
  const { noteId, previousTitle, nextTitle, dryRun } = parsed.data;

  // A "rename" to the same string is not a no-op if it reaches the helper —
  // every matching anchor would be rewritten to the value it already holds,
  // reporting real work and costing a real write for a document that did not
  // change. The editor's autosave sends the title on every pause in typing,
  // so this is the common call, not the exotic one.
  if (previousTitle === nextTitle) {
    return { success: true, data: { notes: 0, links: 0 } };
  }

  try {
    // The link graph already answers "who points at this note", on the
    // `idx_note_links_target_id` index — there is no need to scan documents.
    // Ownership is filtered through the relation rather than trusted: a
    // NoteLink row is written from author-supplied hrefs, and while
    // `updateNote` refuses to record a cross-owner edge, this read must not
    // depend on that having always been true for every row already stored.
    //
    // Only `id` and `content` of the source: a note row carries the full
    // document twice (`content` and `plainText`) and pulling whole rows for
    // every backlink of a hub note is the difference between a page of text
    // and a megabyte of it.
    const inbound = await prisma.noteLink.findMany({
      where: { targetId: noteId, source: { ownerId: session.id } },
      select: { source: { select: { id: true, content: true } } },
    });

    const updates: { id: string; content: string; plainText: string }[] = [];
    let links = 0;

    for (const { source } of inbound) {
      const result = relabelNoteLinks(source.content, {
        noteId,
        from: previousTitle,
        to: nextTitle,
      });

      // `changed === 0` covers three cases at once and all three want the
      // same thing: the label was hand-written, the label was already
      // current, or the document does not parse. None of them is an error,
      // and none of them may cost a write — the helper returns the original
      // string by identity precisely so this skip is safe.
      if (result.changed === 0) continue;

      links += result.changed;
      updates.push({
        id: source.id,
        content: result.content,
        // Derived here, never carried from the read: `plainText` is what
        // search reads, and the anchor text just changed, so a note whose
        // body still indexed the old title would keep answering searches for
        // a name that is no longer in it.
        plainText: richTextToPlainText(result.content),
      });
    }

    if (dryRun) {
      // Counted from exactly the same pass that would have written, so a dry
      // run cannot disagree with the real one about how much it will touch.
      return { success: true, data: { notes: updates.length, links } };
    }

    for (let index = 0; index < updates.length; index += WRITE_CHUNK_SIZE) {
      const chunk = updates.slice(index, index + WRITE_CHUNK_SIZE);

      // `updateMany` rather than `update`, for the reason `update-note.ts`
      // gives: it takes a full `where`, so ownership is enforced by the same
      // statement that writes. The relation filter above already scoped the
      // read, but the write must not lean on a check made in an earlier
      // round trip.
      await prisma.$transaction(
        chunk.map(({ id, content, plainText }) =>
          prisma.note.updateMany({
            where: { id, ownerId: session.id },
            data: { content, plainText },
          })
        )
      );
    }

    // Deliberately NOT rebuilding the `NoteLink` rows, and this will look
    // like an omission to anyone who reads `updateNote` first — that action
    // rewrites a note's edges on every content save. It does not apply here.
    // Only the anchor TEXT changed; every `href` in every document is
    // byte-for-byte what it was, so the set of (sourceId, targetId) pairs is
    // identical before and after. A rebuild would delete and reinsert rows to
    // arrive at the rows it started with, taking locks and WAL on the one
    // table a rename has no reason to touch, and widening a cosmetic
    // operation into one that can lose the knowledge graph if it fails
    // halfway.
    return { success: true, data: { notes: updates.length, links } };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to update note links');
    logger.error(`Relabel inbound note links error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
