'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { dayPhotoIdSchema } from '@/entities/day-entry/model/day-entry-schema';
import { privateStorage } from '@/shared/api/s3-storage-api';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Remove one photo, OBJECT first then row: the reverse leaves a row whose
 * bytes are gone, a permanent broken image. Ownership is checked on the row's
 * denormalised `ownerId` — defence in depth behind `requireAdmin` (§5).
 */
export async function deleteDayPhoto(
  input: unknown
): Promise<ApiResponse<{ id: string }>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(dayPhotoIdSchema, input, 'deleteDayPhoto');
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const photo = await prisma.dayPhoto.findUnique({
      where: { id: parsed.data.id },
      select: { fileKey: true, ownerId: true },
    });

    if (!photo || photo.ownerId !== session.id) {
      return { success: false, errorMsg: 'Photo not found' };
    }

    await privateStorage.deleteFile(photo.fileKey);
    await prisma.dayPhoto.delete({ where: { id: parsed.data.id } });

    return { success: true, data: { id: parsed.data.id } };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to delete the photo');
    logger.error(`Delete day photo error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
