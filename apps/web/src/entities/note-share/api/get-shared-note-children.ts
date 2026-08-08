'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { resolveNoteAccess } from '@/entities/note-share/lib/resolve-note-access';
import type { SharedNoteChild } from '@/entities/note-share/model/types';
import { requireUser } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * One level of the shared tree.
 *
 * The upward walk on the PARENT is the whole authorisation: if the caller can
 * reach the parent, they can reach its children, because a child's own walk
 * passes through that parent and would find the same grant. There is
 * deliberately no separate "is this inside the shared subtree" check — that
 * question is what `resolveNoteAccess` answers.
 */
export async function getSharedNoteChildren(
  parentId: string
): Promise<ApiResponse<SharedNoteChild[]>> {
  await requireUser();

  const parsedId = parseInput(idSchema, parentId);
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  const access = await resolveNoteAccess(parsedId.data);
  if (!access) {
    return { success: false, errorMsg: 'Not found' };
  }

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
      orderBy: [{ position: 'asc' }, { title: 'asc' }],
    });

    return {
      success: true,
      data: children.map((child) => ({
        id: child.id,
        title: child.title,
        parentId: child.parentId,
        position: child.position,
        updatedAt: child.updatedAt,
        createdAt: child.createdAt,
        status: child.status,
        isFolder: child.isFolder,
        childCount: child._count.children,
        // Constants, not narrowed owner data. This surface exposes neither the
        // owner's label vocabulary nor their pin ordering, and `NoteRow` wants
        // a `NoteTreeNode`; `archivedAt` is null because the query excluded
        // archived rows outright.
        labelIds: [],
        isPinned: false,
        archivedAt: null,
      })),
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load notes');
    logger.error(`Get shared note children error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
