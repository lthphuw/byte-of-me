'use server';

import { type Prisma, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { NotePage, NoteTreeNode } from '@/entities/note/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** Rows per request. Matches `getNoteChildren` so both lists page alike. */
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

export interface GetNotesPageInput {
  /** Which order the author picked in the view menu. */
  sort: 'updated' | 'created' | 'title';
  includeArchived?: boolean;
  /** The previous page's `nextCursor`. Exclusive. */
  cursor?: string | null;
  limit?: number;
}

/**
 * Every order here is TOTAL — pinned first, the chosen sort, then `id`.
 *
 * The `id` tiebreak is not decoration. `updatedAt` ties constantly (one bulk
 * edit stamps a whole batch identically) and two rows tying on the sort column
 * may come back in either order between requests; a cursor into that order
 * skips or repeats rows at every page boundary.
 */
const ORDER_BY: Record<
  GetNotesPageInput['sort'],
  Prisma.NoteOrderByWithRelationInput[]
> = {
  updated: [{ isPinned: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
  created: [{ isPinned: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
  title: [{ isPinned: 'desc' }, { title: 'asc' }, { id: 'asc' }],
};

/**
 * The flat view's list: every document the owner has, cursor-paginated.
 *
 * The sort moved server-side because the client's `sortFlat` could only order
 * what it already held — and it only held everything because the sidebar
 * fetched the whole corpus. Sorting a *window* client-side would order that
 * window and nothing else, so page 2 could contain a row that belongs at the
 * top of page 1.
 *
 * `isFolder: false` is part of the query rather than a filter over the result
 * for the same reason: dropping folders after the fact would leave short pages
 * behind, because the `limit + 1` probe counts rows the caller never sees.
 */
export async function getNotesPage(
  input: GetNotesPageInput
): Promise<ApiResponse<NotePage<NoteTreeNode>>> {
  const session = await requireAdmin();

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Math.floor(input.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT)
  );

  // A server action is an addressable endpoint, so `sort` can arrive as any
  // string whatever the type says. An unmapped one would hand Prisma
  // `undefined` — a 500 for what is only a bad argument.
  const orderBy = ORDER_BY[input.sort] ?? ORDER_BY.updated;

  try {
    const rows = await prisma.note.findMany({
      where: {
        ownerId: session.id,
        // The flat view lists documents, never containers. No `parentId`
        // here on purpose: this list spans the whole hierarchy.
        isFolder: false,
        ...(input.includeArchived ? {} : { archivedAt: null }),
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
        // Join-row ids only — label names come from `getNoteLabels`, once,
        // instead of repeating on every one of N rows.
        labels: { select: { labelId: true } },
        _count: { select: { children: true } },
      },
      orderBy,
      // One more than asked for: if it comes back, there is another page. The
      // alternative is a second `count` query per scroll.
      take: limit + 1,
      ...(input.cursor
        ? // `skip: 1` makes the cursor exclusive. Without it every page after
          // the first repeats its predecessor's last row.
          { cursor: { id: input.cursor }, skip: 1 }
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
    const errorMsg = getErrorMessage(error, 'Failed to load notes');
    logger.error(`Get notes page error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
