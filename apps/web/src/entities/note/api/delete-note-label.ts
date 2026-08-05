'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Deletes a label everywhere — the DB cascade clears its `NoteOnLabel`
 * assignments. Owner-scoped by the same statement that deletes.
 */
export async function deleteNoteLabel(id: string): Promise<ApiResponse<null>> {
  const session = await requireAdmin();

  const parsedId = parseInput(idSchema, id);
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  try {
    const { count } = await prisma.noteLabel.deleteMany({
      where: { id: parsedId.data, ownerId: session.id },
    });
    if (count === 0) {
      return { success: false, errorMsg: 'Label not found' };
    }
    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to delete label');
    logger.error(`Delete note label error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
