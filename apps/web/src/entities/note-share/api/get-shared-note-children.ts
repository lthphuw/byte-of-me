'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

// `import type` — erased at compile time, so reaching into the note slice's
// barrel for one shape drags nothing into any bundle. Same as `model/types.ts`.
import type { NotePage } from '@/entities/note';
import { resolveNoteAccess } from '@/entities/note-share/lib/resolve-note-access';
import type { SharedNoteChild } from '@/entities/note-share/model/types';
import { requireUser } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** Rows per request. Same ceiling as the owner's `getNoteChildren`. */
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

export interface GetSharedNoteChildrenInput {
  /** The folder to read. Always a real id — a recipient has no root level. */
  parentId: string;
  /** The previous page's `nextCursor`. Exclusive. */
  cursor?: string | null;
  limit?: number;
}

/**
 * One level of the shared tree, cursor-paginated.
 *
 * The upward walk on the PARENT is the whole authorisation: if the caller can
 * reach the parent, they can reach its children, because a child's own walk
 * passes through that parent and would find the same grant. There is
 * deliberately no separate "is this inside the shared subtree" check — that
 * question is what `resolveNoteAccess` answers.
 *
 * Paginated in the same shape as `getNoteChildren`, and for the same reason:
 * an unbounded level means a shared folder with a few thousand children is one
 * unbounded read, and nothing about being a recipient rather than the owner
 * makes that folder smaller.
 */
export async function getSharedNoteChildren(
  input: GetSharedNoteChildrenInput
): Promise<ApiResponse<NotePage<SharedNoteChild>>> {
  await requireUser();

  const parsedId = parseInput(idSchema, input.parentId);
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  const access = await resolveNoteAccess(parsedId.data);
  if (!access) {
    return { success: false, errorMsg: 'Not found' };
  }

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Math.floor(input.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT)
  );

  try {
    const children = await prisma.note.findMany({
      where: {
        parentId: parsedId.data,
        ownerId: access.ownerId,
        // Archived children are absent entirely, matching the resolver: a note
        // in the trash is not part of what was shared.
        archivedAt: null,
      },
      select: {
        id: true,
        title: true,
        parentId: true,
        position: true,
        updatedAt: true,
        createdAt: true,
        status: true,
        isFolder: true,
        // Counts archived children too, so a folder holding only archived
        // notes still offers an expand chevron that opens onto nothing. That
        // is the same cosmetic imprecision the owner's own tree accepts; a
        // second filtered count is not worth the query.
        _count: { select: { children: true } },
      },
      // A TOTAL order, `id` last, exactly as `getNoteChildren` documents:
      // rows tying on [position, title] could otherwise come back in either
      // order between requests and a cursor into that skips or repeats rows.
      // `isPinned` leads the owner's ordering and is deliberately absent
      // here — it is their preference, and this surface does not expose it.
      orderBy: [{ position: 'asc' }, { title: 'asc' }, { id: 'asc' }],
      // One more than asked for: if it comes back, there is another page.
      take: limit + 1,
      ...(input.cursor
        ? // `skip: 1` makes the cursor exclusive. Without it every page after
          // the first repeats its predecessor's last row.
          { cursor: { id: input.cursor }, skip: 1 }
        : {}),
    });

    const hasMore = children.length > limit;
    const page = hasMore ? children.slice(0, limit) : children;

    return {
      success: true,
      data: {
        rows: page.map((child) => ({
          id: child.id,
          title: child.title,
          parentId: child.parentId,
          position: child.position,
          updatedAt: child.updatedAt,
          createdAt: child.createdAt,
          status: child.status,
          isFolder: child.isFolder,
          childCount: child._count.children,
          // Constants, not narrowed owner data. This surface exposes neither
          // the owner's label vocabulary nor their pin ordering, and `NoteRow`
          // wants a `NoteTreeNode`; `archivedAt` is null because the query
          // excluded archived rows outright.
          labelIds: [],
          isPinned: false,
          archivedAt: null,
        })),
        nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load notes');
    logger.error(`Get shared note children error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
