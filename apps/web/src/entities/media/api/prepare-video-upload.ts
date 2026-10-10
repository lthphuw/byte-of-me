'use server';

import { logger } from '@byte-of-me/logger';

import { buildMediaFileKey } from '@/entities/media/model/media-file-key';
import { videoUploadRequestSchema } from '@/entities/media/model/media-schema';
import {
  extensionForMimeType,
  type MediaScope,
} from '@/entities/media/model/upload-constraints';
import { supabaseStorage } from '@/shared/api';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** Long enough for a slow upload of 10 MB to start; the URL only ever writes one key. */
const UPLOAD_URL_TTL_SECONDS = 300;

/**
 * Step 1 of a clip upload: a signed URL the browser PUTs the file to itself.
 *
 * A clip cannot travel inside a server action: Vercel refuses a function request
 * body over 4.5 MB, before any of our code runs, and the client then only sees
 * "An unexpected response was received from the server". The bytes are checked
 * by `finalizeVideoUpload`; this only vouches for the name, type and size claimed.
 */
export async function prepareVideoUpload(
  input: {
    fileName: string;
    mimeType: string;
    size: number;
    scope: MediaScope;
  }
): Promise<ApiResponse<{ uploadUrl: string; fileKey: string }>> {
  const user = await requireAdmin();

  const parsed = parseInput(videoUploadRequestSchema, input, 'prepareVideoUpload');
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
