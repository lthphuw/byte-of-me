'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { NoteLinkGraph } from '@/entities/note/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * What this note links to, and what links back to it.
 *
 * Both sides are one level deep. The links panel renders a *tree* — expanding
 * a target shows what it in turn links to — but each level is a separate call
 * for the node the author actually opened, rather than one recursive query
 * that walks a graph of unknown size to draw rows nobody has asked to see.
 *
 * The `select` carries no document, for the reason `getNoteTree` gives: this
 * draws a list of titles.
 */
export async function getNoteLinks(
  id: string
): Promise<ApiResponse<NoteLinkGraph>> {
  const session = await requireAdmin();

  const parsedId = parseInput(idSchema, id);
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  try {
    // Ownership is enforced on the *related* note, not just on this one: a
    // link row could name a target the caller does not own only if something
    // upstream let it through, and reading it back would leak that note's
    // title. `updateNote` verifies the same thing on the way in; this is the
    // matching guard on the way out.
    const owned = { ownerId: session.id };

    const [outgoing, incoming] = await Promise.all([
      prisma.noteLink.findMany({
        where: { sourceId: parsedId.data, target: owned },
        select: {
          target: { select: { id: true, title: true, archivedAt: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.noteLink.findMany({
        where: { targetId: parsedId.data, source: owned },
        select: {
          source: { select: { id: true, title: true, archivedAt: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      success: true,
      data: {
        outgoing: outgoing.map((row) => row.target),
        incoming: incoming.map((row) => row.source),
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load note links');
    logger.error(`Get note links error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
