'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { resolveNoteAccess } from '@/entities/note-share/lib/resolve-note-access';
import type { SharedNoteAncestor } from '@/entities/note-share/model/types';
import { requireUser } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** What the raw CTE returns — snake_case, straight off the table. */
interface AncestorRow {
  id: string;
  title: string;
  is_folder: boolean;
}

/**
 * The breadcrumb on the shared surface — and where it STOPS.
 *
 * The chain ends at the share root. One rung further would name a folder the
 * recipient was never given, and the folder names above a shared note are
 * exactly the kind of thing this whole surface exists to keep out of view: an
 * owner who shares `Work / Q3 / Retro` did not thereby say anything about
 * what else lives under `Work`.
 */
export async function getSharedNoteAncestors(
  noteId: string
): Promise<ApiResponse<SharedNoteAncestor[]>> {
  await requireUser();

  const parsedId = parseInput(idSchema, noteId);
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  const access = await resolveNoteAccess(parsedId.data);
  if (!access) {
    return { success: false, errorMsg: 'Not found' };
  }

  try {
    // Owner scoping is inside the walk on every level, for the reason
    // `getNoteAncestors` records: the walk STOPS at the first row that owner
    // does not hold rather than climbing past it and dropping the row later.
    //
    // The `WHERE a.id <> rootId` on the recursive arm is the extra bound this
    // version needs: once the walk has emitted the share root it does not
    // climb beyond it. `depth` counts up from the immediate parent, so
    // `ORDER BY depth DESC` hands the chain back root-first.
    const rows = await prisma.$queryRaw<AncestorRow[]>`
      WITH RECURSIVE ancestors AS (
        SELECT p.id, p.title, p.is_folder, p.parent_id, 1 AS depth
        FROM notes n
        JOIN notes p ON p.id = n.parent_id AND p.owner_id = ${access.ownerId}
        WHERE n.id = ${parsedId.data} AND n.owner_id = ${access.ownerId}
        UNION ALL
        SELECT p.id, p.title, p.is_folder, p.parent_id, a.depth + 1
        FROM ancestors a
        JOIN notes p ON p.id = a.parent_id AND p.owner_id = ${access.ownerId}
        WHERE a.id <> ${access.rootId}
      )
      SELECT id, title, is_folder FROM ancestors ORDER BY depth DESC
    `;

    return {
      success: true,
      // snake_case arrives raw from `$queryRaw` and must reach React
      // camelCased — the same mapping `getNoteAncestors` does.
      data: rows.map((row) => ({
        id: row.id,
        title: row.title,
        isFolder: row.is_folder,
      })),
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load the note path');
    logger.error(`Get shared note ancestors error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
