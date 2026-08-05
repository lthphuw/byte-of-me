'use server';

import { type Prisma, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import {
  NO_LABEL_GROUP_KEY,
  type NotePage,
  type NoteTreeNode,
} from '@/entities/note/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** Rows per request. Matches `getNoteChildren` so every list pages alike. */
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

const STATUS_KEY_PREFIX = 'status:';
const LABEL_KEY_PREFIX = 'label:';

export interface GetNotesInGroupInput {
  groupBy: 'status' | 'label';
  /** A `key` exactly as `getNoteGroupSummaries` emitted it. */
  key: string;
  includeArchived?: boolean;
  /** The previous page's `nextCursor`. Exclusive. */
  cursor?: string | null;
  limit?: number;
}

/**
 * Turns a summary's `key` back into the filter that produced its count, or
 * `null` if the key does not belong to this grouping.
 *
 * Returning `null` rather than an empty object matters: a key that silently
 * contributed no `where` clause would list every note the owner has under one
 * section header — the whole-corpus read in disguise.
 */
function bucketFilter(
  groupBy: GetNotesInGroupInput['groupBy'],
  key: string
): Prisma.NoteWhereInput | null {
  if (groupBy === 'status') {
    if (!key.startsWith(STATUS_KEY_PREFIX)) return null;
    // Everything after the first colon: a status is free-form author
    // vocabulary and may itself contain colons or spaces.
    const status = key.slice(STATUS_KEY_PREFIX.length);
    return status ? { status } : null;
  }

  // "No join rows" is what unlabeled means to the database.
  if (key === NO_LABEL_GROUP_KEY) return { labels: { none: {} } };
  if (!key.startsWith(LABEL_KEY_PREFIX)) return null;
  const labelId = key.slice(LABEL_KEY_PREFIX.length);
  // `some`, not an equality: one note wears several labels and belongs in
  // every one of their buckets — the semantics `groupRows` had client-side.
  return labelId ? { labels: { some: { labelId } } } : null;
}

/**
 * One bucket of the grouped explorer, cursor-paginated.
 *
 * Sections load independently and on expand, which is why the counts come from
 * `getNoteGroupSummaries` instead of from these rows: this action only ever
 * knows about the page it just read. The two must agree on the note filter —
 * owner, documents only, archived-or-not — or a header counts a set its own
 * section does not list.
 *
 * The order and the cursor mechanics are `getNoteChildren`'s, deliberately: a
 * row can appear in the tree and in a group, and two different orders for the
 * same rows read as a bug to the author.
 */
export async function getNotesInGroup(
  input: GetNotesInGroupInput
): Promise<ApiResponse<NotePage<NoteTreeNode>>> {
  const session = await requireAdmin();

  // A server action is an addressable endpoint: the key can arrive as any
  // string whatever the type says, so it is validated before a query runs.
  const filter = bucketFilter(input.groupBy, input.key);
  if (!filter) {
    return { success: false, errorMsg: 'Unknown note group' };
  }

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Math.floor(input.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT)
  );

  try {
    const rows = await prisma.note.findMany({
      where: {
        ownerId: session.id,
        // Documents, never containers — and in the query, not over the
        // result: filtering afterwards would leave short pages behind,
        // because the `limit + 1` probe counts rows the caller never sees.
        isFolder: false,
        ...(input.includeArchived ? {} : { archivedAt: null }),
        ...filter,
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
      // A TOTAL order, same as `getNoteChildren`. `id` last is what makes the
      // cursor meaningful: without it two rows tying on
      // [isPinned, position, title] may come back in either order between
      // requests, and a cursor into that skips or repeats rows.
      orderBy: [
        { isPinned: 'desc' },
        { position: 'asc' },
        { title: 'asc' },
        { id: 'asc' },
      ],
      // One more than asked for: if it comes back, there is another page. The
      // alternative is a second `count` query per section, per scroll.
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
    logger.error(`Get notes in group error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
