'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { richTextToPlainText } from '@byte-of-me/ui/lib/rich-text-content';

import { extractNoteLinkIds } from '@/entities/note/model/note-links';
import {
  type UpdateNoteInput,
  updateNoteSchema,
} from '@/entities/note/model/note-schema';
import type { NoteUpdateResult } from '@/entities/note/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * See `create-note.ts` for why no note action calls `revalidateTag`.
 *
 * Answers with `NoteUpdateResult`, NOT the whole `NoteDetail` — see that
 * type for why sending the document back is both the largest cost on this
 * path and the mechanism by which a save could move the open note's text
 * backwards. It is a breaking change to this action's contract rather than
 * the additive one §11.6 prefers, because "the response no longer carries
 * `content`" cannot be expressed as an added field; every caller was updated
 * with it (the autosave, its offline sync queue, pin, rename, the tree's
 * status drop, and the properties panel), and each now completes its own
 * cache write from the buffer it sent.
 */
export async function updateNote(
  input: UpdateNoteInput
): Promise<ApiResponse<NoteUpdateResult>> {
  const session = await requireAdmin();

  const parsed = parseInput(updateNoteSchema, input);
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }
  const { id, title, content, status, properties, isPinned } = parsed.data;

  try {
    // `updateMany` rather than `update`: it takes a full `where`, so ownership
    // is enforced by the same statement that writes. `update` only accepts a
    // unique selector, which would mean reading first and trusting the gap.
    const { count } = await prisma.note.updateMany({
      where: { id, ownerId: session.id },
      data: {
        ...(title === undefined ? {} : { title }),
        ...(status === undefined ? {} : { status }),
        ...(properties === undefined ? {} : { properties }),
        ...(isPinned === undefined ? {} : { isPinned }),
        // `plainText` is always derived here and never accepted from the
        // client, so the search index cannot drift from the document.
        ...(content === undefined
          ? {}
          : { content, plainText: richTextToPlainText(content) }),
      },
    });

    // Links are derived from the document, never patched incrementally — see
    // the rebuild further down for the shape of that, and for the read that
    // now lets an unchanged link set skip the write entirely.
    //
    // Two gates, and both matter. `content !== undefined`, because the
    // autosave sends title and body separately and a rename must not rewrite
    // links. And `count > 0` — the `updateMany` above matched nothing for a
    // note that does not exist *or belongs to someone else*, and without this
    // the delete below would happily clear that other owner's links for an id
    // the caller merely guessed. The `findFirstOrThrow` further down would
    // have rejected the request either way, but only after the damage.
    if (content !== undefined && count > 0) {
      const linkedIds = extractNoteLinkIds(content);

      // Ownership is verified here rather than trusted from the href: the
      // href is author-supplied text inside a document, so a pasted link to
      // someone else's note id would otherwise write a row pointing across
      // owners. Self-links are dropped too — a note listing itself under
      // "links out" is noise, and the row is not wrong so much as useless.
      const targets = linkedIds.length
        ? await prisma.note.findMany({
            where: {
              id: { in: linkedIds.filter((target) => target !== id) },
              ownerId: session.id,
            },
            select: { id: true },
          })
        : [];

      // What this note already links to — one indexed read on `sourceId`.
      //
      // It buys the ability to do NOTHING, which is the common case and was
      // previously the expensive one: an autosave fires on every pause in
      // typing, and prose almost never moves a `[[` link, yet every one of
      // those saves ran a delete-and-reinsert transaction. A note with no
      // links at all — most of them — still paid an unconditional
      // `deleteMany`. A select on an indexed column costs far less than a
      // write transaction, which takes locks and WAL whether or not it
      // changes a row.
      //
      // Both sides are sorted id lists, so the comparison is exact rather
      // than heuristic: same length and same members in the same order means
      // the stored edges already ARE what the document says.
      const existing = await prisma.noteLink.findMany({
        where: { sourceId: id },
        select: { targetId: true },
      });
      const previousIds = existing.map((row) => row.targetId).sort();
      const nextIds = targets.map((target) => target.id).sort();
      const unchanged =
        previousIds.length === nextIds.length &&
        previousIds.every((targetId, index) => targetId === nextIds[index]);

      // Rebuilt wholesale, never patched incrementally, when it does change:
      // the document is the single source of truth for what it links to, and
      // a delete-then-insert of this note's own rows cannot drift from it the
      // way a diff can.
      if (!unchanged) {
        await prisma.$transaction([
          prisma.noteLink.deleteMany({ where: { sourceId: id } }),
          ...(nextIds.length
            ? [
                prisma.noteLink.createMany({
                  data: nextIds.map((targetId) => ({
                    sourceId: id,
                    targetId,
                  })),
                  // A document can carry the same link twice;
                  // `extractNoteLinkIds` already dedupes, so this is belt and
                  // braces against a future caller that does not.
                  skipDuplicates: true,
                }),
              ]
            : []),
        ]);
      }
    }

    // Narrow on purpose: `content` is the one column no caller needs back
    // (they all just sent it, or did not touch it), and the label join is
    // work nothing on this path reads — a save cannot move a label. What is
    // left is the server's clock plus the three fields `updateNoteSchema`
    // normalises, which is the whole reason a read-back happens at all.
    const note = await prisma.note.findFirstOrThrow({
      where: { id, ownerId: session.id },
      select: {
        id: true,
        title: true,
        status: true,
        properties: true,
        isPinned: true,
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
