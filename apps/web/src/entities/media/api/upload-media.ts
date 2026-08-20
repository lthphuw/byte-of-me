'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import {
  describeViolation,
  extensionForMimeType,
  findUploadViolation,
  type MediaScope,
} from '@/entities/media/model/upload-constraints';
import { supabaseStorage } from '@/shared/api';
import { env } from '@/shared/config/env';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { generateFriendlyId } from '@/shared/lib/friendly-id';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { Media } from '@/shared/types/models';





/**
 * Stores images and records them in the media library.
 *
 * This is the only place every upload path meets — the media library form, and
 * the `uploadSingleMedia` the rich text editors hand to their image extension —
 * so it is where the size and type rules have to be enforced. A check in a form
 * component is a courtesy that gives the author a fast answer; this one is the
 * guarantee.
 */
export async function uploadMedia(
  files: File[],
  scope: MediaScope = 'general'
): Promise<ApiResponse<Media[]>> {
  const user = await requireAdmin();

  if (!files || files.length === 0) {
    return { success: false, errorMsg: 'No files provided.' };
  }

  // Before any network or database work: an oversized file that reaches
  // storage is worse than a rejected one, because the editor then holds a URL
  // to an object the reader's browser has to download in full.
  const violation = findUploadViolation(files);
  if (violation) {
    return { success: false, errorMsg: describeViolation(violation) };
  }

  try {
    const uploadPromises = files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      // From the MIME type, not the filename: the editor's auto-upload builds
      // its File as `new File([blob], 'image')`, with no extension to read.
      const fileExtension = extensionForMimeType(file.type);
      const now = new Date();
      // Scope first, then date. Grouping by what the image is FOR is the axis
      // someone actually browses by; the date only disambiguates within it.
      const fileKey = `users/${user.id}/media/${scope}/${now.getFullYear()}/${String(
        now.getMonth() + 1
      ).padStart(2, '0')}/${generateFriendlyId()}.${fileExtension}`;

      await supabaseStorage.uploadFile({
        fileKey,
        body: buffer,
        contentType: file.type,
      });

      const url = await supabaseStorage.getPublicUrl(fileKey);

      return prisma.media.create({
        data: {
          url,
          bucket: env.SUPABASE_S3_STORAGE_BUCKET,
          fileKey: fileKey,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          provider: 'SUPABASE',
          userId: user.id,
        },
      });
    });

    const results = await Promise.all(uploadPromises);

    revalidateTag(CACHE_TAGS.MEDIA, 'max');
    return { success: true, data: results };
  } catch (error) {
    logger.error(`Upload error: ${getErrorMessage(error)}`);
    return { success: false, errorMsg: 'Failed to upload one or more images.' };
  }
}
