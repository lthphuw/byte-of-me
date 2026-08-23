'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { toDayPhotoRow } from '@/entities/day-entry';
import { dayPhotoCaptionSchema } from '@/entities/day-entry/model/day-entry-schema';
import type { DayPhotoRow } from '@/entities/day-entry/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Write one photo's caption.
 *
 * Its own action rather than part of the day's save, because captions save on
 * blur: a caption typed under one photo should not wait behind a Save button
 * that is about the reflection, and a sheet dismissed by a swipe should not
 * lose it.
 *
 * `updateMany` scoped by owner rather than `update` by id, so an id belonging
 * to someone else matches zero rows instead of throwing — and the caller
 * learns nothing about whether that id exists.
 */
export async function updateDayPhotoCaption(
  input: unknown
): Promise<ApiResponse<DayPhotoRow>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(
      dayPhotoCaptionSchema,
      input,
      'updateDayPhotoCaption'
    );
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { id, caption } = parsed.data;

    const result = await prisma.dayPhoto.updateMany({
      where: { id, ownerId: session.id },
      data: { caption },
    });

    if (result.count === 0) {
      return { success: false, errorMsg: 'Photo not found' };
    }

    const row = await prisma.dayPhoto.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        caption: true,
        position: true,
        mimeType: true,
        size: true,
      },
    });

    return { success: true, data: toDayPhotoRow(row) };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to save the caption');
    logger.error(`Update day photo caption error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
