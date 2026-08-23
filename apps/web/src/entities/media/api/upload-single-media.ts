import { uploadMedia } from './upload-media';

import {
  describeViolation,
  findUploadViolation,
  type MediaScope,
} from '@/entities/media/model/upload-constraints';
import { getImageCompressionSettings } from '@/entities/workspace-settings/api/get-image-compression-settings';
import { compressInBrowser } from '@/shared/lib/media/compress-in-browser';

/**
 * Uploads one image and returns its public URL, for the rich text editors.
 *
 * Compresses BEFORE validating, not after. This function runs in the browser
 * — it hands off to the `uploadMedia` server action, but does not become one
 * itself — so a phone photo that arrives here at 5 MB and would compress to
 * 400 KB must be compressed first, or `findUploadViolation` rejects it for
 * being 5 MB before compression ever gets a chance to run.
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
  const compressionConfig = await getImageCompressionSettings();
  const compressed = await compressInBrowser(file, compressionConfig);

  const violation = findUploadViolation([compressed]);
  if (violation) {
    throw new Error(describeViolation(violation));
  }

  const res = await uploadMedia([compressed], scope);

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
