'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { dayEntryRangeSchema } from '@/entities/day-entry/model/day-entry-schema';
import type {
  DayEntryRow,
  DayPhotoRow,
} from '@/entities/day-entry/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { localDateKey } from '@/shared/lib/health/local-date';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** What a photo row looks like coming out of Prisma, before the route path is
 *  attached. */
interface StoredPhoto {
  id: string;
  caption: string | null;
  position: number;
  mimeType: string;
  size: number;
}

/**
 * Attach the address.
 *
 * The bucket is private, so a photo's URL is not a property of the object —
 * it is the route that will serve it after checking the session. Building it
 * on read rather than storing it is what stops a column of dead public URLs
 * accumulating, and what makes moving the route a one-line change.
 */
export function toDayPhotoRow(photo: StoredPhoto): DayPhotoRow {
  return { ...photo, url: `/api/health/photos/${photo.id}` };
}

/**
 * Read one window of days, photos included.
 *
 * Inclusive at both ends, bounded by the caller's window rather than by a
 * limit, because the caller is the sleep screen and its window is a month —
 * the same shape `getSleepLogs` reads, so the two merge cleanly in
 * `SleepScreen`.
 */
export async function getDayEntries(
  input: unknown
): Promise<ApiResponse<DayEntryRow[]>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(dayEntryRangeSchema, input, 'getDayEntries');
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { from, to } = parsed.data;

    const rows = await prisma.dayEntry.findMany({
      where: {
        ownerId: session.id,
        localDate: {
          gte: new Date(`${from}T00:00:00.000Z`),
          lte: new Date(`${to}T00:00:00.000Z`),
        },
      },
      orderBy: { localDate: 'asc' },
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
      data: rows.map((row) => ({
        id: row.id,
        localDate: localDateKey(row.localDate),
        mood: row.mood,
        reflection: row.reflection,
        photos: row.photos.map(toDayPhotoRow),
      })),
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load day entries');
    logger.error(`Get day entries error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
