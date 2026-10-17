/**
 * The rules the server pass (`sharp`) and the browser pass (canvas) share, so
 * the two cannot disagree on what "compressed" means. Pure: no browser needed.
 */

/**
 * SVG would be rasterised, a format change nobody asked for. GIF would lose its
 * animation: canvas and `sharp` (without `animated: true`) keep only frame one.
 */
const SKIPPED_MIME_TYPES = new Set([
  'image/svg+xml',
  'image/gif',
  // Not images at all: a canvas or `sharp` pass cannot read a clip, and must never try.
  'video/mp4',
  'video/webm',
]);

export function shouldSkipCompression(mimeType: string): boolean {
  return SKIPPED_MIME_TYPES.has(mimeType);
}

/**
 * Output size for an image capped on its LONGEST edge (a portrait's is its
 * height), aspect kept, never enlarged: the input comes back verbatim when
 * already inside the cap, or when a dimension or the cap is non-positive.
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
 * True when compressing made the file no smaller (small PNGs routinely grow:
 * re-encoding adds container overhead); the caller then keeps the original.
 */
export function shouldKeepOriginal(
  originalBytes: number,
  compressedBytes: number
): boolean {
  return compressedBytes >= originalBytes;
}
