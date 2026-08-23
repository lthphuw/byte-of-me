'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { toDayPhotoRow } from '@/entities/day-entry';
import { dayPhotoFileKey } from '@/entities/day-entry/lib/storage-key';
import { dayPhotoUploadSchema } from '@/entities/day-entry/model/day-entry-schema';
import {
  describePhotoViolation,
  findPhotoViolation,
  photoExtension,
} from '@/entities/day-entry/model/photo-constraints';
import type { DayPhotoRow } from '@/entities/day-entry/model/types';
import { privateStorage } from '@/shared/api/s3-storage-api';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Store photos for one day.
 *
 * `privateStorage`, never `supabaseStorage`. The public bucket answers an
 * anonymous GET with 200 — measured, and recorded in `s3-storage-api.ts`.
 * These are personal photographs on a private surface, so their only address
 * is `/api/health/photos/[id]`, behind a session check.
 *
 * The entry is upserted first, so the first photo dropped on an untouched day
 * works without the owner having typed anything. `update: {}` is not a
 * mistake: the upsert exists to guarantee the row, not to change it.
 *
 * The object is written BEFORE the row, deliberately. A crash between the two
 * then leaves an orphaned object — invisible, harmless, costing a few
 * kilobytes — rather than a row pointing at nothing, which would render a
 * broken image on every visit for the rest of the entry's life.
 */
export async function uploadDayPhotos(
  input: unknown,
  files: File[]
): Promise<ApiResponse<DayPhotoRow[]>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(dayPhotoUploadSchema, input, 'uploadDayPhotos');
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    if (!files || files.length === 0) {
      return { success: false, errorMsg: 'No files provided.' };
    }

    const { localDate } = parsed.data;
    const day = new Date(`${localDate}T00:00:00.000Z`);

    const entry = await prisma.dayEntry.upsert({
      where: { ownerId_localDate: { ownerId: session.id, localDate: day } },
      create: { localDate: day, ownerId: session.id },
      update: {},
      select: { id: true },
    });

    // The ceiling counts what is already stored, not just this batch — five
    // photos uploaded one at a time is the same day as five at once.
    const existingCount = await prisma.dayPhoto.count({
      where: { dayEntryId: entry.id },
    });

    const violation = findPhotoViolation(files, existingCount);
    if (violation) {
      return { success: false, errorMsg: describePhotoViolation(violation) };
    }

    const rows: DayPhotoRow[] = [];

    // Sequential, not `Promise.all`. `position` is assigned from the running
    // count, and three concurrent uploads would all read the same count and
    // land on the same position.
    for (const [offset, file] of files.entries()) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileKey = dayPhotoFileKey(
        session.id,
        localDate,
        photoExtension(file.type)
      );

      await privateStorage.uploadFile({
        fileKey,
        body: buffer,
        contentType: file.type,
      });

      const row = await prisma.dayPhoto.create({
        data: {
          fileKey,
          mimeType: file.type,
          size: file.size,
          position: existingCount + offset,
          dayEntryId: entry.id,
          ownerId: session.id,
        },
        select: {
          id: true,
          caption: true,
          position: true,
          mimeType: true,
          size: true,
        },
      });

      rows.push(toDayPhotoRow(row));
    }

    return { success: true, data: rows };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to upload photos');
    logger.error(`Upload day photos error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
