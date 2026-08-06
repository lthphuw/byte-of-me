'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { NoteAncestor } from '@/entities/note/model/types';
import { requireAdmin } from '@/shared/lib/auth';
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
 * The chain of folders above `noteId`, root first, excluding the note itself.
 *
 * Two callers need it, and neither can compute it in the browser: the explorer
 * has to expand every collapsed folder on the path to reveal a note opened
 * from the command palette or a `[[` link, and the editor header draws that
 * same path as a `Work / Sprints / Retro` breadcrumb. Since the tree loads one
 * level at a time, an unexpanded ancestor is simply not in memory — the same
 * reason `getDescendantCount` exists for the downward direction.
 *
 * A recursive CTE rather than a loop of `findMany` calls: the depth is
 * unbounded and each level would otherwise be a round trip.
 */
export async function getNoteAncestors(
  noteId: string
): Promise<ApiResponse<NoteAncestor[]>> {
  const session = await requireAdmin();

  const parsedId = parseInput(idSchema, noteId);
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  try {
    // Owner scoping is inside the walk, on every level, not applied to the
    // result: the seed only resolves for a note this owner holds, and each
    // step climbs through `JOIN notes p ... AND p.owner_id`, so the walk STOPS
    // at the first row the owner does not hold instead of climbing past it.
    // Filtering afterwards would be strictly weaker — a chain that passes
    // through a foreign folder would still be traversed, and dropping those
    // rows from the output would leave a breadcrumb that silently skips a
    // level while confirming, by its length, that the level is there.
    //
    // `depth` counts up from the immediate parent, so `ORDER BY depth DESC`
    // is root first, immediate parent last. It stays inside the CTE: it is
    // int4, which the driver hands over as a number rather than the BigInt
    // `getDescendantCount` has to coerce, but nothing outside this walk needs
    // it. Neither does anything selected here have that problem — `id` and
    // `title` are text, `is_folder` is boolean.
    const rows = await prisma.$queryRaw<AncestorRow[]>`
      WITH RECURSIVE ancestors AS (
        SELECT p.id, p.title, p.is_folder, p.parent_id, 1 AS depth
        FROM notes n
        JOIN notes p ON p.id = n.parent_id AND p.owner_id = ${session.id}
        WHERE n.id = ${parsedId.data} AND n.owner_id = ${session.id}
        UNION ALL
        SELECT p.id, p.title, p.is_folder, p.parent_id, a.depth + 1
        FROM ancestors a
        JOIN notes p ON p.id = a.parent_id AND p.owner_id = ${session.id}
      )
      SELECT id, title, is_folder FROM ancestors ORDER BY depth DESC
    `;

    return {
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        title: row.title,
        isFolder: row.is_folder,
      })),
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load note ancestors');
    logger.error(`Get note ancestors error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
