'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { buildMediaFileKey } from '@/entities/media/model/media-file-key';
import { mediaScopeSchema } from '@/entities/media/model/media-schema';
import {
  type AcceptedMediaMimeType,
  describeViolation,
  extensionForMimeType,
  findUploadViolation,
  isVideoMimeType,
  maxUploadSizeFor,
  type MediaScope,
  resolveUploadedMimeType,
  sanitizeStoredFileName,
} from '@/entities/media/model/upload-constraints';
import { getWorkspaceSettings } from '@/entities/workspace-settings/api/get-workspace-settings';
import { supabaseStorage } from '@/shared/api';
import { env } from '@/shared/config/env';
import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { compressImage } from '@/shared/lib/media/compress-image';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { Media } from '@/shared/types/models';

/**
 * Stores images and short mp4/webm clips and records them in the media library.
 *
 * This is the only place every upload path meets — the media library form, and
 * the `uploadSingleMedia` the rich text editors hand to their image extension —
 * so it is where the size and type rules have to be enforced. A check in a form
 * component is a courtesy that gives the author a fast answer; this one is the
 * guarantee.
 *
 * Compression is the other half of that guarantee. Both upload paths already
 * compress in the browser before they get here, but that check is bypassable
 * by calling this action directly, and canvas encoding differs between Safari
 * and Chrome — so `compressImage` runs again here, and it is the POST
 * -compression buffer, mime type and size that actually get stored. Storing
 * the pre-compression `file.type`/`file.size` would leave the database
 * describing bytes that were never written to the bucket.
 *
 * A video is stored byte for byte: it never reaches `sharp`, and its type must
 * agree with what its bytes are (see `resolveUploadedMimeType`).
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
  // to an object the reader's browser has to download in full. Checked
  // against the AS-UPLOADED bytes, before compression — a direct call to this
  // action with an oversized file is exactly the case this guards, and
  // compressing it first would let an arbitrarily large upload in as long as
  // it happened to compress under the ceiling.
  const violation = findUploadViolation(files);
  if (violation) {
    return { success: false, errorMsg: describeViolation(violation) };
  }

  // Typed, but the action is callable with any string and this is a key segment.
  const parsedScope = parseInput(mediaScopeSchema, scope, 'uploadMedia');
  if (!parsedScope.ok) {
    return { success: false, errorMsg: parsedScope.errorMsg };
  }

  try {
    // The type comes from the bytes, not the caller's `file.type`; an
    // unrecognised file, or a video that is not what it claims, is refused
    // before any storage or database work.
    const incoming: {
      file: File;
      buffer: Buffer;
      mimeType: AcceptedMediaMimeType;
    }[] = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = resolveUploadedMimeType(file.type, buffer);

      if (!mimeType) {
        return {
          success: false,
          errorMsg: describeViolation({
            kind: 'type',
            fileName: sanitizeStoredFileName(file.name),
          }),
        };
      }
      // `File.size` was checked above; the bytes actually read are the ones that count.
      const max = maxUploadSizeFor(mimeType);
      if (buffer.byteLength > max.bytes) {
        return {
          success: false,
          errorMsg: describeViolation({
            kind: 'size',
            fileName: sanitizeStoredFileName(file.name),
            maxSizeMb: max.mb,
          }),
        };
      }
      incoming.push({ file, buffer, mimeType });
    }

    const compression = (await getWorkspaceSettings()).imageCompression;

    const uploadPromises = incoming.map(async ({ file, buffer, mimeType }) => {
      const compressed = isVideoMimeType(mimeType)
        ? { buffer, mimeType }
        : await compressImage(buffer, mimeType, compression);

      // From the POST-compression MIME type, not the filename or the original
      // type: a webp buffer written under a `.jpg` key is a file no CDN
      // serves sensibly, and the editor's auto-upload builds its File as
      // `new File([blob], 'image')` anyway, with no extension to read.
      const fileExtension = extensionForMimeType(compressed.mimeType);
      const fileKey = buildMediaFileKey(
        user.id,
        parsedScope.data,
        fileExtension
      );

      await supabaseStorage.uploadFile({
        fileKey,
        body: compressed.buffer,
        contentType: compressed.mimeType,
      });

      const url = await supabaseStorage.getPublicUrl(fileKey);

      return prisma.media.create({
        data: {
          url,
          bucket: env.SUPABASE_S3_STORAGE_BUCKET,
          fileKey: fileKey,
          fileName: sanitizeStoredFileName(file.name),
          mimeType: compressed.mimeType,
          size: compressed.buffer.byteLength,
          provider: 'SUPABASE',
          userId: user.id,
        },
      });
    });

    const results = await Promise.all(uploadPromises);

    revalidateTag(CACHE_TAGS.MEDIA, 'max');
    return { success: true, data: results };
  } catch (error) {
    const summary = describeFiles(files);
    logger.error(
      `Upload error: ${describeUploadFailure(error)} [${summary}] scope=${
        parsedScope.data
      }`
    );
    return { success: false, errorMsg: explainUploadFailure(error, files) };
  }
}

const toMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const describeFiles = (files: File[]) =>
  files
    .map(
      (file) =>
        `${sanitizeStoredFileName(file.name)} ${file.type} ${toMb(file.size)}`
    )
    .join(', ');

/** `Name (HTTP status): message` — what an S3-style or Prisma error actually says. */
function describeUploadFailure(error: unknown): string {
  const { name, $metadata } = (error ?? {}) as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  const status = $metadata?.httpStatusCode;

  return `${name ?? 'Error'}${
    status ? ` (HTTP ${status})` : ''
  }: ${getErrorMessage(error)}`;
}

/**
 * The reason a stored upload failed, for the author. The storage bucket has its
 * own size limit, separate from ours; hitting it used to read as a bare
 * "Failed to upload", with the cause only in the server log.
 */
function explainUploadFailure(error: unknown, files: File[]): string {
  const summary = describeFiles(files);

  if ((error as { name?: string } | null)?.name === 'EntityTooLarge') {
    return `The storage bucket refused ${summary}: it is over the bucket's own file size limit (Supabase → Storage → bucket settings).`;
  }

  return `Failed to upload ${summary}. ${describeUploadFailure(error)}`;
}
