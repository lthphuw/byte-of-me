'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { richTextToPlainText } from '@byte-of-me/ui/lib/rich-text-content';

import { extractNoteLinkIds } from '@/entities/note';
import { resolveNoteAccess } from '@/entities/note-share/lib/resolve-note-access';
import {
  type UpdateSharedNoteInput,
  updateSharedNoteSchema,
} from '@/entities/note-share/model/note-share-schema';
import { rewriteNoteLinks } from '@/entities/note-share/model/rewrite-note-links';
import type {
  NoteAccess,
  SharedNoteDetail,
} from '@/entities/note-share/model/types';
import { requireUser } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

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
  input: UpdateSharedNoteInput
): Promise<ApiResponse<SharedNoteDetail>> {
  await requireUser();

  const parsed = parseInput(updateSharedNoteSchema, input);
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }
  const { id, title } = parsed.data;

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
      where: { id, ownerId: access.ownerId },
      data: {
        ...(title === undefined ? {} : { title }),
        // `plainText` is always derived here and never accepted from the
        // client, so the search index cannot drift from the document.
        ...(content === undefined
          ? {}
          : { content, plainText: richTextToPlainText(content) }),
      },
    });

    // Both gates matter, for the reasons `updateNote` records: `content`
    // because the autosave sends title and body separately and a rename must
    // not rewrite links, and `count > 0` because a miss means the note does
    // not exist or is not this owner's, and the delete below would otherwise
    // clear somebody else's links for an id the caller merely guessed.
    if (content !== undefined && count > 0) {
      await rebuildLinks({ id, content, access });
    }

    const note = await prisma.note.findFirst({
      where: { id, ownerId: access.ownerId },
      select: {
        id: true,
        title: true,
        content: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        properties: true,
        isFolder: true,
      },
    });

    if (!note) {
      return { success: false, errorMsg: 'Not found' };
    }

    return {
      success: true,
      data: {
        ...note,
        content: rewriteNoteLinks(note.content, 'toShared'),
        role: access.role,
        rootId: access.rootId,
        // The save response is not what draws the shell — `getSharedNoteById`
        // is, and its value is already on screen. Echoing this note's own
        // label keeps the type honest without a second read per keystroke.
        rootTitle: note.title,
        rootIsFolder: note.isFolder,
        // Empty on a save, deliberately. The client already holds the set from
        // its initial `getSharedNoteById`, and a save cannot make a target
        // reachable that was not already — recomputing it would put a second
        // subtree walk behind every debounced keystroke.
        linkableIds: [],
        // Null for the same reason it is null for any EDITOR: the caller is
        // holding the live editor, not a rendered copy, so producing one would
        // drag the whole Tiptap schema through a save path that never prints it.
        html: null,
      },
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
