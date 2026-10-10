import { finalizeVideoUpload } from './finalize-video-upload';
import { prepareVideoUpload } from './prepare-video-upload';

import type { MediaScope } from '@/entities/media/model/upload-constraints';
import type { Media } from '@/shared/types/models';

const defaultDeps = {
  prepare: prepareVideoUpload,
  finalize: finalizeVideoUpload,
  put: (url: string, init: RequestInit) => fetch(url, init),
};

export type DirectVideoUploadDeps = typeof defaultDeps;

/**
 * Uploads a clip browser → storage with a signed URL, then records it.
 * Throws with the reason: `ImageUploadFn`'s contract, like the image path.
 */
export async function uploadVideoDirect(
  file: File,
  scope: MediaScope,
  deps: DirectVideoUploadDeps = defaultDeps
): Promise<Media> {
  const prepared = await deps.prepare({
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    scope,
  });
  if (!prepared?.success) {
    throw new Error(prepared?.errorMsg || 'Upload failed');
  }

  const { uploadUrl, fileKey } = prepared.data;
  const put = await deps.put(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!put.ok) {
    const detail = (await put.text().catch(() => '')).slice(0, 200);
    throw new Error(
      `Storage refused "${file.name}" (HTTP ${put.status})${detail ? `: ${detail}` : ''}`
    );
  }

  const done = await deps.finalize({ fileKey, fileName: file.name });
  if (!done?.success) {
    throw new Error(done?.errorMsg || 'Upload failed');
  }

  return done.data;
}
