import type sharpModule from 'sharp';

import 'server-only';

import {
  IMAGE_COMPRESSION_DEFAULTS,
  type ImageCompressionConfig,
} from '@/shared/lib/media/image-compression-config';
import {
  computeTargetDimensions,
  shouldKeepOriginal,
  shouldSkipCompression,
} from '@/shared/lib/media/image-compression-rules';

export interface CompressedImage {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
}

// `sharp`'s own types are exported as `export = sharp` with a merged
// `declare function` + `declare namespace`, which a default import does not
// re-expose as a `sharp.Sharp` type reference. `ReturnType<typeof sharp>` is
// the standard workaround — same instance type, derived instead of named.
type SharpInstance = ReturnType<typeof sharpModule>;

/**
 * `sharp` is loaded on FIRST COMPRESSION, never at module load.
 *
 * It used to be a top-level `import sharp from 'sharp'`. `sharp` is a native
 * addon, so Turbopack compiles it as an external — and a module that awaits an
 * external is an ASYNC MODULE, whose await runs while every importer is still
 * evaluating. That turned "this route contains a photo-upload action" into
 * "this route dlopens libvips before it renders a single element", and on
 * Vercel, where `@img/sharp-libvips-linux-x64` was missing, the dlopen threw:
 *
 *   Failed to load external module sharp-edea96869fc6cbfe:
 *   ERR_DLOPEN_FAILED: libvips-cpp.so.8.18.3: cannot open shared object file
 *
 * That throw happens BEFORE React renders, which is why it produced Next's
 * bare 500 rather than `error.tsx` — an error boundary can only catch what
 * fails inside a render. `/space/health/sleep` (now `/space/daily`) was the
 * casualty: its day journal legitimately owns `uploadDayPhotos`, so the
 * encoder was in its graph even though a calendar never encodes anything.
 *
 * Behind a function, the cost lands on the one call that actually needs it.
 * A broken sharp then fails the upload it belongs to — which the action
 * already reports as a failed upload — instead of taking down every page that
 * merely links to one. The promise is cached so repeated compressions in one
 * request share a single load.
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
 * Compresses an uploaded image on the server — the guarantee behind the
 * client-side pass in `compress-in-browser.ts`. A client check is bypassable
 * by calling the server action directly, and canvas encoding differs between
 * Safari and Chrome, so this is what every stored byte actually goes through.
 *
 * SVG and GIF are returned untouched, for the same reason
 * `shouldSkipCompression` gives: SVG is a vector `sharp` would rasterise, and
 * `sharp` reads only the first frame of a GIF unless told otherwise, which
 * would silently destroy an animation. There is no `{ animated: true }`
 * opt-in here, deliberately — this IS the guarantee layer, so introducing
 * animated re-encoding only on this side would make the two passes disagree
 * about what "compressed" means for the same file.
 *
 * `.rotate()` with no arguments reads the EXIF orientation tag and bakes the
 * rotation into the pixel data before anything else runs — this is the fix
 * for the single most likely bug in this feature: skip it and a portrait
 * phone photo (stored sensor-native, rotated only by an EXIF tag) uploads
 * sideways, because `sharp` does not auto-orient by default. `.metadata()`
 * reports the PRE-rotation physical dimensions regardless, so a 90/270°
 * orientation (EXIF values 5-8) has its width and height swapped below before
 * they are used to compute the longest-edge target — otherwise a portrait
 * photo's cap would be applied to the wrong axis.
 *
 * `sharp` does not preserve metadata unless `withMetadata()` is called, so
 * every other EXIF field (GPS, camera model, capture time) is dropped as a
 * side effect of encoding. That is intentional for a public asset host, not
 * an oversight worth "fixing" with `withMetadata()`.
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
    // `fit: 'fill'` because `target` is already computed to preserve aspect
    // ratio and never enlarge — asking sharp to re-derive that with `inside`
    // would just risk a one-pixel disagreement with what this function
    // reports as the output dimensions.
    pipeline = pipeline.resize({
      width: target.width,
      height: target.height,
      fit: 'fill',
      withoutEnlargement: true,
    });
  }

  const format: EncodableFormat =
    config.format === 'webp' ? 'webp' : (encoderForMimeType(mimeType) ?? 'webp');
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
