import {
  computeTargetDimensions,
  IMAGE_COMPRESSION_DEFAULTS,
  type ImageCompressionConfig,
  shouldKeepOriginal,
  shouldSkipCompression,
} from '@byte-of-me/contracts';
import type sharpModule from 'sharp';

import 'server-only';

interface CompressedImage {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
}

// sharp's types are `export =` with a merged function and namespace, so a default import does not
// expose `sharp.Sharp`; ReturnType<typeof sharp> derives the same instance type.
type SharpInstance = ReturnType<typeof sharpModule>;

/**
 * `sharp` loads on first compression, never at module load: it is a native addon, so a top-level
 * import makes every importing route dlopen libvips before render (ERR_DLOPEN_FAILED, bare 500,
 * no error.tsx). Lazy, a broken sharp fails only the upload; the cached promise shares one load.
 */
let sharpPromise: Promise<typeof sharpModule> | null = null;

function loadSharp(): Promise<typeof sharpModule> {
  sharpPromise ??= import('sharp').then((mod) => mod.default);
  return sharpPromise;
}

/** The sharp encoder and the mime type it produces, per re-encodable input format. */
const ENCODERS = {
  jpeg: {
    encode: (img: SharpInstance, quality: number) => img.jpeg({ quality }),
    mimeType: 'image/jpeg',
  },
  png: {
    // sharp's png `quality` drives its internal quantiser, same as the other
    // encoders — it does not make PNG lossy.
    encode: (img: SharpInstance, quality: number) => img.png({ quality }),
    mimeType: 'image/png',
  },
  webp: {
    encode: (img: SharpInstance, quality: number) => img.webp({ quality }),
    mimeType: 'image/webp',
  },
  avif: {
    encode: (img: SharpInstance, quality: number) => img.avif({ quality }),
    mimeType: 'image/avif',
  },
} as const;

type EncodableFormat = keyof typeof ENCODERS;

function encoderForMimeType(mimeType: string): EncodableFormat | null {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpeg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/avif':
      return 'avif';
    default:
      return null;
  }
}

/**
 * Server guarantee behind the client pass; SVG and GIF pass through (sharp rasterises SVG, keeps
 * one GIF frame). `.rotate()` bakes EXIF orientation; `.metadata()` is pre-rotation, so 5-8 swap axes.
 * Other EXIF (GPS, camera) is dropped on purpose: do not add `withMetadata()`.
 */
export async function compressImage(
  input: Buffer,
  mimeType: string,
  config: ImageCompressionConfig = IMAGE_COMPRESSION_DEFAULTS
): Promise<CompressedImage> {
  if (!config.enabled || shouldSkipCompression(mimeType)) {
    return { buffer: input, mimeType, ...(await readDimensions(input)) };
  }

  const sharp = await loadSharp();
  const source = sharp(input, { failOn: 'none' }).rotate();
  const metadata = await source.metadata();

  // EXIF orientation 5-8 involves a 90° turn, which swaps which physical
  // dimension ends up as the display width vs. height once `.rotate()` runs.
  const swapsAxes = (metadata.orientation ?? 1) >= 5;
  const originalWidth = (swapsAxes ? metadata.height : metadata.width) ?? 0;
  const originalHeight = (swapsAxes ? metadata.width : metadata.height) ?? 0;

  const target = computeTargetDimensions(
    originalWidth,
    originalHeight,
    config.maxWidth
  );

  let pipeline = source;
  if (
    originalWidth > 0 &&
    originalHeight > 0 &&
    (target.width !== originalWidth || target.height !== originalHeight)
  ) {
    // `fit: 'fill'`: `target` already preserves aspect ratio and never enlarges, and `inside` could
    // disagree with the reported output dimensions by a pixel.
    pipeline = pipeline.resize({
      width: target.width,
      height: target.height,
      fit: 'fill',
      withoutEnlargement: true,
    });
  }

  const format: EncodableFormat =
    config.format === 'webp' ? 'webp' : encoderForMimeType(mimeType) ?? 'webp';
  const encoder = ENCODERS[format];

  const { data, info } = await encoder
    .encode(pipeline, config.quality)
    .toBuffer({ resolveWithObject: true });

  if (shouldKeepOriginal(input.byteLength, data.byteLength)) {
    return { buffer: input, mimeType, ...(await readDimensions(input)) };
  }

  return {
    buffer: data,
    mimeType: encoder.mimeType,
    width: info.width,
    height: info.height,
  };
}

async function readDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number }> {
  try {
    const sharp = await loadSharp();
    const metadata = await sharp(buffer, { failOn: 'none' }).metadata();
    return { width: metadata.width ?? 0, height: metadata.height ?? 0 };
  } catch {
    return { width: 0, height: 0 };
  }
}
