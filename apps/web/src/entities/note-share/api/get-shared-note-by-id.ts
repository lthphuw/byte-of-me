'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
// The directive-free render module, NOT `@byte-of-me/ui` or
// `./rich-text-editor` — `rich-text.tsx` records that importing the schema
// from the editor entry registers it as a client reference and ships it.
import { renderRichTextHtml } from '@byte-of-me/ui/rich-text-render';

import { extractNoteLinkIds } from '@/entities/note';
import { resolveNoteAccess } from '@/entities/note-share/lib/resolve-note-access';
import {
  rewriteNoteLinks,
  stripUnreachableNoteLinks,
} from '@/entities/note-share/model/rewrite-note-links';
import type { SharedNoteDetail } from '@/entities/note-share/model/types';
import { requireUser } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * A shared document, as its recipient sees it.
 *
 * The select is narrower than `getAdminNoteById`'s on purpose. No `labels`,
 * because `NoteLabel` is unique per owner and spans the whole vault, so a name
 * like `job-hunting-2026` is information from outside the shared subtree. No
 * `isPinned`, which is the owner's own ordering preference and means nothing
 * here. `properties` and `status` stay: they are authored on the note itself.
 */
export async function getSharedNoteById(
  id: string
): Promise<ApiResponse<SharedNoteDetail>> {
  await requireUser();

  const parsedId = parseInput(idSchema, id);
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  const access = await resolveNoteAccess(parsedId.data);
  if (!access) {
    // Deliberately not distinguishing "no such note" from "not shared with
    // you" — the same choice `deleteNote` and `moveNote` document.
    return { success: false, errorMsg: 'Not found' };
  }

  try {
    // Scoped to the note's OWNER, taken from the resolver — never to the
    // caller, who owns nothing on this surface.
    const note = await prisma.note.findFirst({
      where: { id: parsedId.data, ownerId: access.ownerId },
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

    // Rewritten, not filtered — `rewriteNoteLinks` records why an
    // out-of-scope mark has to stay in the document an editor saves back.
    const shared = rewriteNoteLinks(note.content, 'toShared');
    const linkableIds = await resolveLinkableIds({
      content: note.content,
      access,
    });

    return {
      success: true,
      data: {
        ...note,
        content: shared,
        role: access.role,
        rootId: access.rootId,
        linkableIds,
        // Rendered here, on the server, and only for a viewer. See the field's
        // own comment: `renderRichTextHtml` drags the whole Tiptap schema in,
        // and a viewer must never pay for the editor they cannot use.
        html:
          access.role === 'EDITOR'
            ? null
            : renderRichTextHtml(
                stripUnreachableNoteLinks(shared, linkableIds)
              ),
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load note');
    logger.error(`Get shared note error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}

/**
 * Which of this document's links the caller can actually follow.
 *
 * Resolved against the owner's rows intersected with the shared subtree
 * rather than trusted from the href: the href is author-supplied text inside
 * a document, which is the same reason `updateNote` verifies its link targets
 * on the way in.
 *
 * The ids are read from the ORIGINAL content, before the rewrite — that is
 * what `extractNoteLinkIds` knows how to parse.
 */
async function resolveLinkableIds({
  content,
  access,
}: {
  content: string;
  access: { ownerId: string; rootId: string };
}): Promise<string[]> {
  const linkedIds = extractNoteLinkIds(content);

  if (linkedIds.length === 0) {
    return [];
  }

  // The mirror of `resolveNoteAccess`'s upward walk: down from the share root,
  // bounded by the same owner at every level.
  const reachable = await prisma.$queryRaw<{ id: string }[]>`
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
  `;

  return reachable.map((row) => row.id);
}
