import type { ImageCompressionConfig } from '@/shared/lib/media/image-compression-config';
import {
  computeTargetDimensions,
  shouldKeepOriginal,
  shouldSkipCompression,
} from '@/shared/lib/media/image-compression-rules';

/**
 * Compresses an image FILE in the browser before it crosses the network.
 *
 * This is what makes a large phone photo uploadable at all — the server's
 * per-file ceiling would otherwise reject it before any server code runs. It
 * is not the guarantee: `compress-image.ts` re-runs the same rules
 * server-side, because this is trivially bypassable (call the server action
 * directly) and canvas encoding differs across browsers.
 *
 * SVG and disabled-config both return the file untouched, same as the server
 * pass and for the same reason — see `shouldSkipCompression`.
 *
 * ## EXIF orientation
 *
 * `createImageBitmap`'s `imageOrientation` option defaults to `'none'` per
 * spec — the OPPOSITE of how an `<img>` tag has rendered EXIF-rotated photos
 * since browsers normalised on `image-orientation: from-image` as the CSS
 * default. Decoding with that default here would draw the sensor's raw
 * (often sideways) pixel layout onto the canvas, and `canvas.toBlob()` never
 * writes EXIF back out — so the orientation tag that would have fixed it on
 * redisplay is gone too, and the photo is permanently sideways. Passing
 * `imageOrientation: 'from-image'` explicitly bakes the rotation into the
 * pixels during decode, which is also the point every OTHER EXIF field (GPS,
 * camera model, capture time) is silently dropped — canvas has no metadata
 * channel to carry it, so this is a side effect of decoding through canvas at
 * all, not something this function does deliberately beyond the orientation.
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

    // `'original'` keeps the source's own mime type. Canvas silently falls
    // back to PNG for a requested type it cannot encode (e.g. avif in most
    // engines today) per the HTML spec — an acceptable, safe default, since
    // the server pass re-encodes to whatever the config actually asks for.
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
