'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { SpaceStats } from '@/entities/note/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * The `/space` hub's single aggregate read. Four independent owner-scoped
 * queries in parallel — they need no atomicity, and the array form of
 * `$transaction` this used to take ran them SERIALLY inside one BEGIN/COMMIT.
 * Recents reuse the narrow-select discipline of `getNoteTree` — documents
 * never travel to draw a list of titles.
 */
export async function getSpaceStats(): Promise<ApiResponse<SpaceStats>> {
  try {
    // Guarded INSIDE the try, unlike every sibling action in this directory,
    // and the difference is the caller rather than the policy. The others are
    // called from client components, where a thrown `Unauthorized` becomes a
    // rejected promise their `useQuery` renders as an error state. This one is
    // awaited by `SpaceHub`, a server component, inside a bare `Promise.all` —
    // so the throw escaped the RSC entirely and replaced the whole page with
    // the root `error.tsx`, while the in-place `errors.load` message the hub
    // already renders for a failed read stayed unreachable for the most likely
    // failure of all (a session expiring between the layout's `auth()` and
    // this query). `getNoteTitle` has the same RSC caller and solves it the
    // other way, with a `try` at the call site in `[id]/page.tsx`.
    const session = await requireAdmin();

    const [noteCount, archivedCount, linkCount, recentNotes] =
      await Promise.all([
        // `isFolder: false` — the card is labelled "Notes", and a folder is
        // not one. Without it the hub counted the tree's scaffolding as
        // documents and disagreed with `/space/notes/graph`, which plots the same
        // corpus and has always excluded folders.
        prisma.note.count({
          where: { ownerId: session.id, archivedAt: null, isFolder: false },
        }),
        // Folders deliberately INCLUDED here, for the opposite reason: this
        // number stands for what the trash view shows, and `getArchivedNotes`
        // lists archived folders alongside archived notes.
        prisma.note.count({
          where: { ownerId: session.id, archivedAt: { not: null } },
        }),
        // Both ends live, matching `getNoteGraph`'s edge set. Scoping only the
        // source counted links leaving notes the author had already archived —
        // edges the graph does not draw — so the hub and the graph reported
        // different link totals for the same vault.
        prisma.noteLink.count({
          where: {
            source: { ownerId: session.id, archivedAt: null },
            target: { ownerId: session.id, archivedAt: null },
          },
        }),
        // Folders excluded here too, and here it is not just a count being
        // honest: every row in this list is rendered as a link to
        // `/space/notes/<id>`, and a folder behind that URL opens the editor
        // on a row that has no document to edit.
        prisma.note.findMany({
          where: { ownerId: session.id, archivedAt: null, isFolder: false },
          orderBy: { updatedAt: 'desc' },
          take: 5,
          select: { id: true, title: true, status: true, updatedAt: true },
        }),
      ]);

    return {
      success: true,
      data: { noteCount, archivedCount, linkCount, recentNotes },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load space stats');
    logger.error(`Get space stats error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
