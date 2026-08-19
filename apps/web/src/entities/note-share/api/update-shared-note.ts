'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { richTextToPlainText } from '@byte-of-me/ui/lib/rich-text-content';
import * as z from 'zod';

import { extractNoteLinkIds } from '@/entities/note';
import { resolveNoteAccess } from '@/entities/note-share/lib/resolve-note-access';
import { updateSharedNoteSchema } from '@/entities/note-share/model/note-share-schema';
import { rewriteNoteLinks } from '@/entities/note-share/model/rewrite-note-links';
import type { NoteAccess } from '@/entities/note-share/model/types';
import { requireUser } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * `updateSharedNoteSchema` plus the concurrency base, extended here rather
 * than added to the slice's schema file: `baseUpdatedAt` is not part of what a
 * shared note IS, only of how this one action decides whether a write may
 * land, and every other consumer of that schema would otherwise carry a field
 * it never sends.
 *
 * Optional, so an older client — or any caller that genuinely has no base —
 * keeps exactly the last-write-wins behaviour it had before (AGENTS §11.6).
 * Milliseconds rather than a `Date`, matching how `use-note-editor-autosave`
 * stores the same value, and exact either way: `notes.updated_at` is
 * `TIMESTAMP(3)`, so a JS `Date` round-trips it without truncation.
 */
const updateSharedNoteWithBaseSchema = updateSharedNoteSchema.extend({
  baseUpdatedAt: z.number().int().nonnegative().optional(),
});

export type UpdateSharedNoteWithBaseInput = z.input<
  typeof updateSharedNoteWithBaseSchema
>;

/**
 * What a save can honestly say about itself.
 *
 * Deliberately NOT `SharedNoteDetail`. This action used to return one, with
 * the note's OWN title echoed into `rootTitle` because "the client already has
 * the real value" — true, but it made the envelope unsafe to write into
 * `noteShareKeys.detail`, which is a trap rather than a saving. The real root
 * title would have cost a second row read behind every debounced keystroke,
 * for a string that is already on screen and that a save cannot change. So the
 * type narrows to what the save actually knows.
 *
 * `conflict` travels as a SUCCESS, not an `errorMsg`: nothing went wrong, the
 * write was simply declined in favour of asking the author. Routing it through
 * the failure branch would have shown them a red toast for somebody else's
 * perfectly good edit.
 */
export type SharedNoteSaveResult =
  | {
      status: 'saved';
      id: string;
      /** The row's new `updatedAt` — the base the caller's next save must
       *  send, or every subsequent save reports a conflict with itself. */
      updatedAt: Date;
    }
  | {
      status: 'conflict';
      /** When the version that beat this save was written. */
      serverUpdatedAt: Date;
      /** That version's document, hrefs already rewritten for this surface,
       *  so the author can be offered it without a second round trip. */
      serverContent: string;
    };

/**
 * The only write a non-owner can perform: title and body, nothing else.
 *
 * No create, delete, move, archive, label, property or re-share. That is not
 * a phase-one shortcut — it is what keeps the tree entirely under the owner's
 * control, and it is why exactly ONE action has to reason about two kinds of
 * caller instead of all twenty-five.
 *
 * See `create-note.ts` for why no note action calls `revalidateTag`.
 */
export async function updateSharedNote(
  input: UpdateSharedNoteWithBaseInput
): Promise<ApiResponse<SharedNoteSaveResult>> {
  await requireUser();

  const parsed = parseInput(updateSharedNoteWithBaseSchema, input);
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }
  const { id, title, baseUpdatedAt } = parsed.data;

  const access = await resolveNoteAccess(id);
  if (!access) {
    return { success: false, errorMsg: 'Not found' };
  }
  if (access.role !== 'EDITOR') {
    return { success: false, errorMsg: 'You have view-only access' };
  }

  // Hrefs go back to the owner's route BEFORE anything is persisted. Skipping
  // this would not merely produce a broken link: `parseNoteHref` matches
  // nothing on a `/shared/` href, so the link rebuild below would find no
  // targets and delete every outgoing row the note has.
  const content =
    parsed.data.content === undefined
      ? undefined
      : rewriteNoteLinks(parsed.data.content, 'toOwner');

  try {
    // `updateMany` rather than `update`: it takes a full `where`, so ownership
    // is enforced by the same statement that writes. `update` only accepts a
    // unique selector, which would mean reading first and trusting the gap.
    const { count } = await prisma.note.updateMany({
      where: {
        id,
        ownerId: access.ownerId,
        // Optimistic concurrency, in the same statement that writes — the same
        // reason `ownerId` is here rather than in a read before it. A row that
        // has moved past the version this edit was made on is left alone, so
        // two editors can no longer silently overwrite each other. `lte`, not
        // `equals`: the caller's base is the row it last SAW, and a base that
        // is somehow ahead of the row is not a reason to refuse a write.
        ...(baseUpdatedAt === undefined
          ? {}
          : { updatedAt: { lte: new Date(baseUpdatedAt) } }),
      },
      data: {
        ...(title === undefined ? {} : { title }),
        // `plainText` is always derived here and never accepted from the
        // client, so the search index cannot drift from the document.
        ...(content === undefined
          ? {}
          : { content, plainText: richTextToPlainText(content) }),
      },
    });

    if (count === 0) {
      // The write matched nothing. Either the note is gone, or the guard above
      // held it back — and only the row can say which, so it is read WITH the
      // document: the author is about to be asked to choose between that
      // version and their own, and offering it now saves them a round trip
      // they would have to make with the banner already on screen.
      const current = await prisma.note.findFirst({
        where: { id, ownerId: access.ownerId },
        select: { content: true, updatedAt: true },
      });

      if (
        current &&
        baseUpdatedAt !== undefined &&
        current.updatedAt.getTime() > baseUpdatedAt
      ) {
        return {
          success: true,
          data: {
            status: 'conflict',
            serverUpdatedAt: current.updatedAt,
            // Rewritten the same way `getSharedNoteById` rewrites what it
            // serves, so the caller can seed its editor from this directly.
            serverContent: rewriteNoteLinks(current.content, 'toShared'),
          },
        };
      }

      return { success: false, errorMsg: 'Not found' };
    }

    // Both gates matter, for the reasons `updateNote` records: `content`
    // because the autosave sends title and body separately and a rename must
    // not rewrite links, and `count > 0` — established by the branch above —
    // because a miss means the note does not exist, is not this owner's, or
    // was refused by the concurrency guard, and the delete below would
    // otherwise clear links for a save that never landed.
    if (content !== undefined) {
      await rebuildLinks({ id, content, access });
    }

    // Read back for `updatedAt` alone: it is the base the caller's next save
    // has to send, and `@updatedAt` means only the row knows it. Everything
    // else this used to select — title, body, properties — went back down the
    // wire behind every debounced keystroke for a value the caller already had.
    const saved = await prisma.note.findFirst({
      where: { id, ownerId: access.ownerId },
      select: { updatedAt: true },
    });

    if (!saved) {
      return { success: false, errorMsg: 'Not found' };
    }

    return {
      success: true,
      data: { status: 'saved', id, updatedAt: saved.updatedAt },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to save note');
    logger.error(`Update shared note error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}

/**
 * Rebuild this note's outgoing links from its document, the way `updateNote`
 * does — but with a valid-target set an editor cannot widen.
 *
 * Valid = inside the shared subtree, OR already a target before this save.
 * The first half stops an editor pasting an arbitrary note id to inject a
 * backlink into a note they cannot see. The second preserves the links the
 * owner already had out of the shared subtree: the editor's document still
 * carries those marks, and they never chose to remove them.
 */
async function rebuildLinks({
  id,
  content,
  access,
}: {
  id: string;
  content: string;
  access: NoteAccess;
}): Promise<void> {
  // Self-links are dropped for the reason `updateNote` gives: a note listing
  // itself under "links out" is not wrong so much as useless.
  const linkedIds = extractNoteLinkIds(content).filter(
    (target) => target !== id
  );

  if (linkedIds.length === 0) {
    await prisma.noteLink.deleteMany({ where: { sourceId: id } });
    return;
  }

  const [inSubtree, existing] = await Promise.all([
    prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE subtree AS (
        SELECT n.id, n.owner_id
        FROM notes n
        WHERE n.id = ${access.rootId} AND n.owner_id = ${access.ownerId}
        UNION ALL
        SELECT c.id, c.owner_id
        FROM subtree s
        JOIN notes c ON c.parent_id = s.id AND c.owner_id = s.owner_id
      )
      SELECT id FROM subtree WHERE id = ANY(${linkedIds}::text[])
    `,
    prisma.noteLink.findMany({
      where: { sourceId: id },
      select: { targetId: true },
    }),
  ]);

  const allowed = new Set([
    ...inSubtree.map((row) => row.id),
    ...existing.map((row) => row.targetId),
  ]);
  const targets = linkedIds.filter((target) => allowed.has(target));

  // Delete-then-insert of this note's own rows, never an incremental patch:
  // the document is the single source of truth for what it links to, and a
  // diff can drift from it in a way a rebuild cannot.
  await prisma.$transaction([
    prisma.noteLink.deleteMany({ where: { sourceId: id } }),
    ...(targets.length
      ? [
          prisma.noteLink.createMany({
            data: targets.map((targetId) => ({ sourceId: id, targetId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);
}
