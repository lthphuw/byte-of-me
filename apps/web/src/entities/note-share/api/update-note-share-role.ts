'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import {
  type UpdateNoteShareRoleInput,
  updateNoteShareRoleSchema,
} from '@/entities/note-share/model/note-share-schema';
import type { NoteShareRow } from '@/entities/note-share/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** Move one grant between viewer and editor. */
export async function updateNoteShareRole(
  input: UpdateNoteShareRoleInput
): Promise<ApiResponse<NoteShareRow>> {
  const session = await requireAdmin();

  const parsed = parseInput(updateNoteShareRoleSchema, input);
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }
  const { shareId, role } = parsed.data;

  try {
    // `updateMany` rather than `update`: it takes a full `where`, so ownership
    // is enforced by the same statement that writes. `update` only accepts a
    // unique selector, which would mean reading first and trusting the gap.
    const { count } = await prisma.noteShare.updateMany({
      where: { id: shareId, note: { ownerId: session.id } },
      data: { role },
    });

    if (count === 0) {
      return { success: false, errorMsg: 'Share not found' };
    }

    const share = await prisma.noteShare.findFirst({
      where: { id: shareId, note: { ownerId: session.id } },
      select: { id: true, email: true, role: true, recipientId: true },
    });

    if (!share) {
      return { success: false, errorMsg: 'Share not found' };
    }

    return {
      success: true,
      data: {
        id: share.id,
        email: share.email,
        role: share.role === 'EDITOR' ? 'EDITOR' : 'VIEWER',
        accepted: share.recipientId !== null,
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to change access level');
    logger.error(`Update note share role error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
