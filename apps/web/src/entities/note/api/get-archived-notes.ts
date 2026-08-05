'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { NotePage, NoteTreeNode } from '@/entities/note/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

export interface GetArchivedNotesInput {
  cursor?: string | null;
  limit?: number;
}

/**
 * The trash: every archived note the owner has, newest first, paginated.
 *
 * Flat, and it has to be. `getNoteChildren`'s `includeArchived` is INCLUDE,
 * not ONLY, and `archiveNote` cascades DOWN a subtree — so the ordinary case,
 * archiving a note that lived inside a live folder, produces an archived row
 * whose parent is NOT archived. That row belongs to no `parentId: null`
 * level, so a per-level read would silently lose most of what was just
 * archived. Reconstructing the hierarchy instead would mean fetching every
 * archived row anyway to find the parents, which is the whole-corpus read
 * this replaces.
 *
 * A wastebasket sorted by when things went in is also what the view is for:
 * you come here to find the thing you just deleted, not to browse a tree.
 */
export async function getArchivedNotes(
  input: GetArchivedNotesInput
): Promise<ApiResponse<NotePage<NoteTreeNode>>> {
  const session = await requireAdmin();

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Math.floor(input.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT)
  );

  try {
    const rows = await prisma.note.findMany({
      where: {
        ownerId: session.id,
        // `{ not: null }` — `undefined` would return the whole corpus and
        // `null` only the live notes.
        archivedAt: { not: null },
      },
      select: {
        id: true,
        title: true,
        parentId: true,
        position: true,
        isPinned: true,
        archivedAt: true,
        updatedAt: true,
        createdAt: true,
        status: true,
        isFolder: true,
        labels: { select: { labelId: true } },
        _count: { select: { children: true } },
      },
      // `id` last makes this a TOTAL order, which matters more here than
      // elsewhere: archiving a folder stamps its whole subtree inside one
      // transaction, so ties on `archivedAt` are the norm rather than the
      // exception, and a cursor into a non-total order skips or repeats.
      orderBy: [{ archivedAt: 'desc' }, { id: 'asc' }],
      take: limit + 1,
      ...(input.cursor
        ? { cursor: { id: input.cursor }, skip: 1 }
        : {}),
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      success: true,
      data: {
        rows: page.map(({ labels, _count, ...note }) => ({
          ...note,
          labelIds: labels.map((row) => row.labelId),
          childCount: _count.children,
        })),
        nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load archived notes');
    logger.error(`Get archived notes error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
