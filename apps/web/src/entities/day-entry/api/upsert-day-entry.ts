'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { toDayPhotoRow } from '@/entities/day-entry/lib/to-day-photo-row';
import { dayEntryUpsertSchema } from '@/entities/day-entry/model/day-entry-schema';
import type { DayEntryRow } from '@/entities/day-entry/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { localDateKey } from '@/shared/lib/health/local-date';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * One day's mood and reflection. An UPSERT on `(ownerId, localDate)` like
 * `upsertSleepLog`, the unique index making it atomic. Photos are NOT touched:
 * they upload on pick, so this never reconciles a photo list.
 *
 * `requireAdmin` is an IDENTITY check for the single owner, called here rather
 * than only in the layout because a server action is an addressable endpoint
 * that renders no layout (§5).
 */
export async function upsertDayEntry(
  input: unknown
): Promise<ApiResponse<DayEntryRow>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(dayEntryUpsertSchema, input, 'upsertDayEntry');
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { localDate, mood, reflection } = parsed.data;
    const day = new Date(`${localDate}T00:00:00.000Z`);
    const fields = { mood, reflection };

    const row = await prisma.dayEntry.upsert({
      where: { ownerId_localDate: { ownerId: session.id, localDate: day } },
      create: { ...fields, localDate: day, ownerId: session.id },
      update: fields,
      select: {
        id: true,
        localDate: true,
        mood: true,
        reflection: true,
        photos: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            caption: true,
            position: true,
            mimeType: true,
            size: true,
          },
        },
      },
    });

    return {
      success: true,
      data: {
        id: row.id,
        localDate: localDateKey(row.localDate),
        mood: row.mood,
        reflection: row.reflection,
        photos: row.photos.map(toDayPhotoRow),
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to save the day');
    logger.error(`Upsert day entry error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
