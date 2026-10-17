import {
  computeTargetDimensions,
  type ImageCompressionConfig,
  shouldKeepOriginal,
  shouldSkipCompression,
} from '@byte-of-me/contracts';

/**
 * Compresses an image in the browser so a large phone photo fits the server's per-file ceiling;
 * the guarantee is compress-image.ts (this is bypassable and canvas encoding differs per browser).
 * `imageOrientation: 'from-image'` is required: the spec default is 'none' and canvas drops EXIF.
 */
export async function compressInBrowser(
  file: File,
  config: ImageCompressionConfig
): Promise<File> {
  if (!config.enabled || shouldSkipCompression(file.type)) {
    return file;
  }

  // No canvas-safe decode path (a very old browser) — the server pass is
  // still the guarantee, so falling back to the original here is correct
  // behavior, not a gap in coverage.
  if (typeof createImageBitmap !== 'function') {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }

  try {
    const target = computeTargetDimensions(
      bitmap.width,
      bitmap.height,
      config.maxWidth
    );

    const canvas = document.createElement('canvas');
    canvas.width = target.width;
    canvas.height = target.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, target.width, target.height);

    // `'original'` keeps the source mime type. Canvas silently falls back to PNG for a type it cannot
    // encode (avif in most engines); safe, since the server pass re-encodes to the configured format.
    const mimeType = config.format === 'webp' ? 'image/webp' : file.type;
    const quality = config.quality / 100;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mimeType, quality)
    );

    if (!blob || shouldKeepOriginal(file.size, blob.size)) {
      return file;
    }

    const extension = blob.type.split('/')[1] ?? 'jpg';
    const baseName = file.name.replace(/\.[^./]+$/, '');

    return new File([blob], `${baseName}.${extension}`, {
      type: blob.type,
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}
