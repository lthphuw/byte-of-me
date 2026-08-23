/**
 * The compression rules pure enough to share verbatim between the two
 * compressors and to unit test without a browser or `sharp` at all.
 *
 * Both `compress-image.ts` (server, `sharp`) and `compress-in-browser.ts`
 * (client, canvas) decide "which formats pass through untouched", "how big
 * should the output be", and "was compression actually worth keeping" the
 * same way — this is the one place that logic is written, so the two passes
 * cannot quietly disagree about what "compressed" means for the same file.
 */

/**
 * SVG is a vector — both canvas and `sharp` would rasterise it, which is not
 * "compression", it is a format change nobody asked for. GIF is skipped for
 * the same shape of reason: canvas keeps only the first frame it draws, and
 * `sharp` reads only the first frame of a GIF unless told `{ animated: true }`
 * — either way, a re-encode here would silently destroy an animation.
 */
const SKIPPED_MIME_TYPES = new Set(['image/svg+xml', 'image/gif']);

export function shouldSkipCompression(mimeType: string): boolean {
  return SKIPPED_MIME_TYPES.has(mimeType);
}

/**
 * The output size for an image capped at `maxEdge` on its LONGEST side,
 * aspect ratio preserved, never enlarged.
 *
 * "Longest edge" rather than "width": a portrait photo's long side is its
 * height, and constraining the literal width field would leave a 4032x3024
 * portrait's 4032px edge uncapped while over-shrinking the 3024px one.
 *
 * Returns the input dimensions verbatim whenever the longest edge is already
 * at or under the cap, or when either dimension (or the cap) is non-positive
 * — a defensive fallback for a source neither `sharp` nor the browser could
 * measure. That defensive branch IS the never-upscale rule: an image already
 * inside the cap is left exactly as it was, not scaled up to meet it.
 */
export function computeTargetDimensions(
  width: number,
  height: number,
  maxEdge: number
): { width: number; height: number } {
  const longestEdge = Math.max(width, height);

  if (width <= 0 || height <= 0 || maxEdge <= 0 || longestEdge <= maxEdge) {
    return { width, height };
  }

  const scale = maxEdge / longestEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * True when compressing made the file BIGGER, or no smaller — small PNGs
 * routinely do, since re-encoding an already-optimal lossless image adds
 * container overhead a specialised optimiser would not. The caller should
 * discard the compressed bytes and keep the original whenever this is true.
 */
export function shouldKeepOriginal(
  originalBytes: number,
  compressedBytes: number
): boolean {
  return compressedBytes >= originalBytes;
}
