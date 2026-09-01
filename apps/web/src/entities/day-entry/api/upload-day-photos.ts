'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { dayPhotoFileKey } from '@/entities/day-entry/lib/storage-key';
import { toDayPhotoRow } from '@/entities/day-entry/lib/to-day-photo-row';
import { dayPhotoUploadSchema } from '@/entities/day-entry/model/day-entry-schema';
import {
  describePhotoViolation,
  findPhotoViolation,
  photoExtension,
} from '@/entities/day-entry/model/photo-constraints';
import type { DayPhotoRow } from '@/entities/day-entry/model/types';
import { getWorkspaceSettings } from '@/entities/workspace-settings/api/get-workspace-settings';
import { privateStorage } from '@/shared/api/s3-storage-api';
import { requireAdmin } from '@/shared/lib/auth';
import { compressImage } from '@/shared/lib/media/compress-image';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Store photos for one day. `privateStorage`, NEVER `supabaseStorage` — the
 * public bucket answers an anonymous GET with 200 (`s3-storage-api.ts`), and
 * these are personal photographs served only behind a session check.
 *
 * The entry is upserted first (`update: {}` guarantees the row, it does not
 * change it) and the object written before the row: a crash between them
 * leaves a harmless orphaned object, not a row rendering a broken image.
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

    const compression = (await getWorkspaceSettings()).imageCompression;

    const rows: DayPhotoRow[] = [];

    // Sequential, not `Promise.all`. `position` is assigned from the running
    // count, and three concurrent uploads would all read the same count and
    // land on the same position.
    for (const [offset, file] of files.entries()) {
      const buffer = Buffer.from(await file.arrayBuffer());

      // The browser pass is bypassable by calling this action directly, so
      // it runs again here and the POST-compression buffer is what is stored
      // and keyed. SVG/GIF and EXIF behave as `compress-image.ts` documents.
      const compressed = await compressImage(buffer, file.type, compression);

      const fileKey = dayPhotoFileKey(
        session.id,
        localDate,
        photoExtension(compressed.mimeType)
      );

      await privateStorage.uploadFile({
        fileKey,
        body: compressed.buffer,
        contentType: compressed.mimeType,
      });

      const row = await prisma.dayPhoto.create({
        data: {
          fileKey,
          mimeType: compressed.mimeType,
          size: compressed.buffer.byteLength,
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
