'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { SharedInboxItem } from '@/entities/note-share/model/types';
import { normalizeEmail, requireUser } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Everything shared with the caller's address, as one list of entry points.
 *
 * Two kinds of row are hidden. An ARCHIVED note, because `resolveNoteAccess`
 * refuses one anyway — listing it would advertise a note that cannot be
 * opened. And a note NESTED inside another of this recipient's grants,
 * because sharing a folder and then a note inside it would otherwise offer
 * the same subtree twice under two names.
 */
export async function getSharedInbox(): Promise<
  ApiResponse<SharedInboxItem[]>
> {
  const user = await requireUser();
  const email = normalizeEmail(user.email);

  if (!email) {
    return { success: true, data: [] };
  }

  try {
    const rows = await prisma.noteShare.findMany({
      where: { email, note: { archivedAt: null } },
      select: {
        role: true,
        note: {
          select: {
            id: true,
            title: true,
            isFolder: true,
            owner: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (rows.length === 0) {
      return { success: true, data: [] };
    }

    const grantedIds = rows.map((row) => row.note.id);

    // Which granted notes sit inside another granted note. One upward walk per
    // seed, all in a single statement: an inbox is a handful of rows, and a
    // pairwise CTE over every combination would be more machinery than this
    // earns. `c.id <> c.seed` excludes the seed matching itself.
    const nested = await prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE chain AS (
        SELECT n.id AS seed, n.id, n.parent_id, n.owner_id
        FROM notes n
        WHERE n.id = ANY(${grantedIds}::text[])
        UNION ALL
        SELECT c.seed, p.id, p.parent_id, p.owner_id
        FROM chain c
        JOIN notes p ON p.id = c.parent_id AND p.owner_id = c.owner_id
      )
      SELECT DISTINCT c.seed AS id
      FROM chain c
      WHERE c.id <> c.seed AND c.id = ANY(${grantedIds}::text[])
    `;

    const nestedIds = new Set(nested.map((row) => row.id));

    return {
      success: true,
      data: rows
        .filter((row) => !nestedIds.has(row.note.id))
        .map((row) => ({
          noteId: row.note.id,
          title: row.note.title,
          isFolder: row.note.isFolder,
          role: row.role === 'EDITOR' ? ('EDITOR' as const) : ('VIEWER' as const),
          ownerName: row.note.owner.name,
        })),
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load shared notes');
    logger.error(`Get shared inbox error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
