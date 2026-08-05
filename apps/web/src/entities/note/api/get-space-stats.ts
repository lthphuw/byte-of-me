'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { SpaceStats } from '@/entities/note/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * The `/space` hub's single aggregate read. One transaction, four queries, all
 * owner-scoped; recents reuse the narrow-select discipline of `getNoteTree` —
 * documents never travel to draw a list of titles.
 */
export async function getSpaceStats(): Promise<ApiResponse<SpaceStats>> {
  const session = await requireAdmin();

  try {
    const [noteCount, archivedCount, linkCount, recentNotes] =
      await prisma.$transaction([
        prisma.note.count({
          where: { ownerId: session.id, archivedAt: null },
        }),
        prisma.note.count({
          where: { ownerId: session.id, archivedAt: { not: null } },
        }),
        prisma.noteLink.count({
          where: { source: { ownerId: session.id } },
        }),
        prisma.note.findMany({
          where: { ownerId: session.id, archivedAt: null },
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
