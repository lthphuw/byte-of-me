import { uploadMedia } from './upload-media';

import {
  describeViolation,
  findUploadViolation,
  type MediaScope,
} from '@/entities/media/model/upload-constraints';

/**
 * Uploads one image and returns its public URL, for the rich text editors.
 *
 * Validates before crossing the network. The server action validates too and
 * is the real guarantee, but a file that is refused here never leaves the
 * browser — and, more importantly, the caller gets a message naming the file
 * and the limit instead of the framework's opaque body-size rejection.
 *
 * Throws rather than returning a result because that is the contract the
 * editor's `ImageUploadFn` expects.
 */
export async function uploadSingleMedia(
  file: File,
  scope: MediaScope = 'general'
): Promise<string> {
  const violation = findUploadViolation([file]);
  if (violation) {
    throw new Error(describeViolation(violation));
  }

  const res = await uploadMedia([file], scope);

  if (!res?.success || !res.data?.[0].url) {
    // Carry the server's reason up. It used to be flattened to a bare "Upload
    // failed", which the editor then swallowed into the console — leaving the
    // author looking at a `blob:` URL that only resolves in their own tab.
    throw new Error(res?.errorMsg || 'Upload failed');
  }

  return res.data[0].url;
}

/** Binds `uploadSingleMedia` to a scope, for passing as `uploadImage`. */
export function createScopedImageUploader(scope: MediaScope) {
  return (file: File) => uploadSingleMedia(file, scope);
}
