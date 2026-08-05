'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { NotePage, NoteTreeNode } from '@/entities/note/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** Rows per request. Big enough that a normal folder is one round trip. */
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

export interface GetNoteChildrenInput {
  /** The level to read. `null` is the root level — NOT "any parent". */
  parentId: string | null;
  includeArchived?: boolean;
  /** The previous page's `nextCursor`. Exclusive. */
  cursor?: string | null;
  limit?: number;
}

/**
 * One level of the note tree, cursor-paginated.
 *
 * This replaces `getNoteTree`'s single whole-corpus read. A tree cannot be
 * page-paginated as a flat list — `buildNoteTree` needed `parentId` for every
 * node to nest them, so any window of the corpus arrives with holes in the
 * middle of the hierarchy. Loading one level at a time is what every file
 * explorer does and is the only shape that bounds the query without lying
 * about the structure.
 *
 * `childCount` rides along so the expand chevron is correct before a single
 * child has been fetched.
 */
export async function getNoteChildren(
  input: GetNoteChildrenInput
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
        // Present and null for the root level. Omitting the key would match
        // every note the owner has, which is the read this action exists to
        // end — see the spec's own test for it.
        parentId: input.parentId,
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
      // A TOTAL order. `id` last is what makes the cursor meaningful: without
      // it, two rows tying on [isPinned, position, title] may come back in
      // either order between requests, and a cursor into that skips or
      // repeats rows.
      orderBy: [
        { isPinned: 'desc' },
        { position: 'asc' },
        { title: 'asc' },
        { id: 'asc' },
      ],
      // One more than asked for: if it comes back, there is another page. The
      // alternative is a second `count` query per level, per expand.
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
    logger.error(`Get note children error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
