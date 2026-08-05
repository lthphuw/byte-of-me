'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { NoteLabelSummary } from '@/entities/note/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** Every label the author owns — the one list names/colors resolve from. */
export async function getNoteLabels(): Promise<
  ApiResponse<NoteLabelSummary[]>
> {
  const session = await requireAdmin();

  try {
    const labels = await prisma.noteLabel.findMany({
      where: { ownerId: session.id },
      select: { id: true, name: true, color: true },
      orderBy: { name: 'asc' },
    });

    return { success: true, data: labels };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load labels');
    logger.error(`Get note labels error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
