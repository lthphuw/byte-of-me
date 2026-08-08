'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { NoteShareRow } from '@/entities/note-share/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** Who currently has access to one note, as the owner's share dialog draws it. */
export async function getNoteShares(
  noteId: string
): Promise<ApiResponse<NoteShareRow[]>> {
  const session = await requireAdmin();

  const parsedId = parseInput(idSchema, noteId);
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  try {
    const shares = await prisma.noteShare.findMany({
      // Ownership rides on the RELATION, inside the same query, rather than
      // being a check the caller could be trusted to have already done. A note
      // id belonging to somebody else simply matches no rows.
      where: { noteId: parsedId.data, note: { ownerId: session.id } },
      select: { id: true, email: true, role: true, recipientId: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true,
      data: shares.map((share) => ({
        id: share.id,
        email: share.email,
        // Narrowed the same fail-closed way `resolveNoteAccess` does, so the
        // dialog can never show EDITOR for a value the resolver reads as
        // VIEWER.
        role: share.role === 'EDITOR' ? ('EDITOR' as const) : ('VIEWER' as const),
        accepted: share.recipientId !== null,
      })),
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load who has access');
    logger.error(`Get note shares error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
