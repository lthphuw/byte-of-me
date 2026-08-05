'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * The one column `generateMetadata` needs for the tab label. A separate
 * action rather than `getAdminNoteById` on purpose: that one ships the whole
 * document, and fetching a note body to draw browser chrome is exactly what
 * `getNoteTree`'s narrow select exists to avoid.
 */
export async function getNoteTitle(id: string): Promise<ApiResponse<string>> {
  const session = await requireAdmin();

  const parsedId = parseInput(idSchema, id);
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

  try {
    const note = await prisma.note.findFirst({
      where: { id: parsedId.data, ownerId: session.id },
      select: { title: true },
    });
    if (!note) {
      return { success: false, errorMsg: 'Note not found' };
    }
    return { success: true, data: note.title };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load note title');
    logger.error(`Get note title error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
