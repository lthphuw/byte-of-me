'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { parseInput } from '@byte-of-me/api-core/server';
import {
  extensionForMimeType,
  type MediaScope,
  videoUploadRequestSchema,
} from '@byte-of-me/contracts/media';
import { logger } from '@byte-of-me/logger';

import { buildMediaFileKey } from '@/entities/media/model/media-file-key';
import { supabaseStorage } from '@/shared/api';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

/** Long enough for a slow upload of 15 MB to start; the URL only ever writes one key. */
const UPLOAD_URL_TTL_SECONDS = 300;

/**
 * Step 1 of a clip upload: a signed URL the browser PUTs the file to. A clip cannot travel in a
 * server action: Vercel refuses a function body over 4.5 MB before our code runs.
 * `finalizeVideoUpload` checks the bytes; this only vouches for the claimed name, type and size.
 */
export async function prepareVideoUpload(input: {
  fileName: string;
  mimeType: string;
  size: number;
  scope: MediaScope;
}): Promise<ApiResponse<{ uploadUrl: string; fileKey: string }>> {
  const user = await requireAdmin();

  const parsed = parseInput(
    videoUploadRequestSchema,
    input,
    'prepareVideoUpload'
  );
  if (!parsed.ok) return { success: false, errorMsg: parsed.errorMsg };

  try {
    const fileKey = buildMediaFileKey(
      user.id,
      parsed.data.scope,
      extensionForMimeType(parsed.data.mimeType)
    );
    const uploadUrl = await supabaseStorage.getPresignedUploadUrl(
      fileKey,
      UPLOAD_URL_TTL_SECONDS
    );

    return { success: true, data: { uploadUrl, fileKey } };
  } catch (error) {
    logger.error(`Prepare video upload error: ${getErrorMessage(error)}`);
    return { success: false, errorMsg: 'Could not start the upload.' };
  }
}
