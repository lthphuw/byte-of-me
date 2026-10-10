'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { videoExtensionOfOwnKey } from '@/entities/media/model/media-file-key';
import { videoUploadCompletionSchema } from '@/entities/media/model/media-schema';
import {
  describeViolation,
  isVideoMimeType,
  MAX_VIDEO_SIZE_BYTES,
  MAX_VIDEO_SIZE_MB,
  resolveUploadedMimeType,
  sanitizeStoredFileName,
} from '@/entities/media/model/upload-constraints';
import { supabaseStorage } from '@/shared/api';
import { env } from '@/shared/config/env';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { Media } from '@/shared/types/models';

/**
 * Step 2 of a clip upload: the browser has PUT the file, now vouch for it.
 *
 * The signed URL cannot bound the size or the content, so the stored object is
 * read back here and held to the same rules as `uploadMedia`: at most 10 MB, and
 * its bytes must be the mp4/webm its key says. Anything else is deleted, never
 * recorded, so a stray object cannot be served as a library item.
 */
export async function finalizeVideoUpload(input: {
  fileKey: string;
  fileName: string;
}): Promise<ApiResponse<Media>> {
  const user = await requireAdmin();

  const parsed = parseInput(videoUploadCompletionSchema, input, 'finalizeVideoUpload');
  if (!parsed.ok) return { success: false, errorMsg: parsed.errorMsg };
  const { fileKey, fileName } = parsed.data;

  const extension = videoExtensionOfOwnKey(user.id, fileKey);
  if (!extension) return { success: false, errorMsg: 'Unknown upload.' };
  const declared = `video/${extension}`;

  try {
    const stored = await supabaseStorage.getFile(fileKey);
    const size = stored.contentLength ?? 0;

    // Checked before reading: a PUT is unbounded, and the object may be huge.
    if (!stored.body || size === 0 || size > MAX_VIDEO_SIZE_BYTES) {
      await stored.body?.cancel();
      await supabaseStorage.deleteFile(fileKey);
      return {
        success: false,
        errorMsg: describeViolation({
          kind: 'size',
          fileName: sanitizeStoredFileName(fileName),
          maxSizeMb: MAX_VIDEO_SIZE_MB,
        }),
      };
    }

    const bytes = new Uint8Array(await new Response(stored.body).arrayBuffer());
    const mimeType = resolveUploadedMimeType(declared, bytes);

    if (!mimeType || !isVideoMimeType(mimeType)) {
      await supabaseStorage.deleteFile(fileKey);
      return {
        success: false,
        errorMsg: describeViolation({
          kind: 'type',
          fileName: sanitizeStoredFileName(fileName),
        }),
      };
    }

    const media = await prisma.media.create({
      data: {
        url: await supabaseStorage.getPublicUrl(fileKey),
        bucket: env.SUPABASE_S3_STORAGE_BUCKET,
        fileKey,
        fileName: sanitizeStoredFileName(fileName),
        mimeType,
        size: bytes.byteLength,
        provider: 'SUPABASE',
        userId: user.id,
      },
    });

    revalidateTag(CACHE_TAGS.MEDIA, 'max');
    return { success: true, data: media };
  } catch (error) {
    logger.error(`Finalize video upload error: ${getErrorMessage(error)} [${fileKey}]`);
    return { success: false, errorMsg: 'Could not finish the upload.' };
  }
}
