import { uploadMedia } from './upload-media';

import {
  describeViolation,
  findUploadViolation,
  MAX_UPLOAD_BATCH,
  type MediaScope,
} from '@/entities/media/model/upload-constraints';
import { getImageCompressionSettings } from '@/entities/workspace-settings/api/get-image-compression-settings';
import { compressInBrowser } from '@/shared/lib/media/compress-in-browser';
import type { ImageCompressionConfig } from '@/shared/lib/media/image-compression-config';

/**
 * How long a fetched config is reused. A settings change reaches the client
 * pre-pass this late; the server pass always applies the live config, so the
 * worst case is a redundant compression, never a wrongly stored file.
 */
const COMPRESSION_CONFIG_TTL_MS = 30_000;

const defaultDeps = {
  fetchCompressionConfig: getImageCompressionSettings,
  compress: compressInBrowser,
  upload: uploadMedia,
  now: Date.now,
};

type SingleMediaUploaderDeps = typeof defaultDeps;

/**
 * Builds the editors' single-image uploader. Dependencies are injectable so the
 * memo and the compression bound can be exercised without a server action.
 */
export function createSingleMediaUploader(
  deps: SingleMediaUploaderDeps = defaultDeps
) {
  let cachedConfig: {
    value: Promise<ImageCompressionConfig>;
    expiresAt: number;
  } | null = null;

  // Memoised, in flight included: every image used to cost its own settings
  // server action, and a dropped batch asked for the same row once per file.
  const getCompressionConfig = (): Promise<ImageCompressionConfig> => {
    const now = deps.now();
    if (cachedConfig && cachedConfig.expiresAt > now) return cachedConfig.value;

    const value = deps.fetchCompressionConfig();
    cachedConfig = { value, expiresAt: now + COMPRESSION_CONFIG_TTL_MS };
    // A failed read must not be served again for the rest of the window.
    value.catch(() => {
      if (cachedConfig?.value === value) cachedConfig = null;
    });
    return value;
  };

  // At most MAX_UPLOAD_BATCH compressions at once: each decodes a full bitmap
  // and draws a canvas, so a dropped folder must not do them all together.
  let running = 0;
  const waiting: (() => void)[] = [];
  const compressBounded = async (
    file: File,
    config: ImageCompressionConfig
  ): Promise<File> => {
    // A finishing task hands its slot straight to the next waiter, so a call
    // arriving in between cannot slip past the bound.
    if (running < MAX_UPLOAD_BATCH) running += 1;
    else
      await new Promise<void>((resolve) => {
        waiting.push(resolve);
      });

    try {
      return await deps.compress(file, config);
    } finally {
      const next = waiting.shift();
      if (next) next();
      else running -= 1;
    }
  };

  /**
   * Uploads one image and returns its public URL, for the rich text editors.
   * Compresses BEFORE validating: a 5 MB phone photo that compresses to 400 KB
   * must not be refused for its raw size. Throws: that is `ImageUploadFn`'s contract.
   */
  return async function uploadSingleMedia(
    file: File,
    scope: MediaScope = 'general'
  ): Promise<string> {
    const compressionConfig = await getCompressionConfig();
    const compressed = await compressBounded(file, compressionConfig);

    // Refused here, a file never leaves the browser and the caller gets a
    // message naming it, not the framework's opaque body-size rejection.
    const violation = findUploadViolation([compressed]);
    if (violation) {
      throw new Error(describeViolation(violation));
    }

    const res = await deps.upload([compressed], scope);

    if (!res?.success || !res.data?.[0].url) {
      // Carry the server's reason up. It used to be flattened to a bare "Upload
      // failed", which the editor then swallowed into the console — leaving the
      // author looking at a `blob:` URL that only resolves in their own tab.
      throw new Error(res?.errorMsg || 'Upload failed');
    }

    return res.data[0].url;
  };
}

export const uploadSingleMedia = createSingleMediaUploader();

/** Binds `uploadSingleMedia` to a scope, for passing as `uploadImage`. */
export function createScopedImageUploader(scope: MediaScope) {
  return (file: File) => uploadSingleMedia(file, scope);
}
