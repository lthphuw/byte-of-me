import type { ApiResponse } from '@byte-of-me/api-core';

import { finalizeVideoUpload } from './finalize-video-upload';
import { prepareVideoUpload } from './prepare-video-upload';

import type { MediaScope } from '@/entities/media/model/upload-constraints';
import type { Media } from '@/shared/types/models';

const defaultDeps = {
  prepare: prepareVideoUpload,
  finalize: finalizeVideoUpload,
  // RAW-FETCH (R8): the bytes go to a presigned storage URL. A server action
  // body is capped at 4.5 MB on Vercel, and a clip can be 15 MB.
  put: (url: string, init: RequestInit) => fetch(url, init),
};

export type DirectVideoUploadDeps = typeof defaultDeps;

/**
 * Uploads a clip browser → storage with a signed URL, then records it.
 * Every refusal comes back as an envelope; only a transport failure throws.
 */
export async function uploadVideoDirect(
  file: File,
  scope: MediaScope,
  deps: DirectVideoUploadDeps = defaultDeps
): Promise<ApiResponse<Media>> {
  const prepared = await deps.prepare({
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    scope,
  });
  if (!prepared.success) return { success: false, errorMsg: prepared.errorMsg };

  const { uploadUrl, fileKey } = prepared.data;
  const put = await deps.put(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!put.ok) {
    const detail = (await put.text().catch(() => '')).slice(0, 200);
    return {
      success: false,
      errorMsg: `Storage refused "${file.name}" (HTTP ${put.status})${
        detail ? `: ${detail}` : ''
      }`,
    };
  }

  return deps.finalize({ fileKey, fileName: file.name });
}
