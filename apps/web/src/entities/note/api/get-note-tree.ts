'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { NoteTreeNode } from '@/entities/note/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Every note the author owns, flat and ordered — the sidebar builds the nesting
 * with `buildNoteTree`.
 *
 * The `select` is narrow by design. This query returns the author's entire
 * corpus, so including `content` would ship every document on every dashboard
 * load; the editor fetches the one open note through `getAdminNoteById`.
 */
export async function getNoteTree(
  includeArchived = false
): Promise<ApiResponse<NoteTreeNode[]>> {
  const session = await requireAdmin();

  try {
    const notes = await prisma.note.findMany({
      where: {
        ownerId: session.id,
        ...(includeArchived ? {} : { archivedAt: null }),
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
      },
      orderBy: [
        { isPinned: 'desc' },
        { position: 'asc' },
        { title: 'asc' },
        { id: 'asc' },
      ],
    });

    return {
      success: true,
      data: notes.map(({ labels, ...note }) => ({
        ...note,
        labelIds: labels.map((row) => row.labelId),
      })),
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load notes');
    logger.error(`Get note tree error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
