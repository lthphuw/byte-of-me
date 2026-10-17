import * as z from 'zod';

/**
 * One image-compression config for the browser pass, the server pass and the
 * workspace settings row, so the three cannot drift apart on its four fields.
 */

export const IMAGE_COMPRESSION_FORMATS = ['webp', 'original'] as const;
export type ImageCompressionFormat = (typeof IMAGE_COMPRESSION_FORMATS)[number];

/**
 * Generous on purpose: an author-only control, and the never-upscale rule in
 * `image-compression-rules.ts` is the real backstop. 8192 covers any DSLR edge.
 */
const MIN_MAX_WIDTH = 128;
const MAX_MAX_WIDTH = 8192;

export const imageCompressionConfigSchema = z.object({
  enabled: z.boolean(),
  /** Longest-edge cap in pixels. Never upscales — see `computeTargetDimensions`. */
  maxWidth: z.number().int().min(MIN_MAX_WIDTH).max(MAX_MAX_WIDTH),
  quality: z.number().int().min(1).max(100),
  format: z.enum(IMAGE_COMPRESSION_FORMATS),
});

export type ImageCompressionConfig = z.infer<
  typeof imageCompressionConfigSchema
>;

/**
 * The starting config and the fallback for an unreadable one. 2048px at
 * quality 82 is a common "looks lossless, is not" point; webp beats jpeg.
 */
export const IMAGE_COMPRESSION_DEFAULTS: ImageCompressionConfig = {
  enabled: true,
  maxWidth: 2048,
  quality: 82,
  format: 'webp',
};
