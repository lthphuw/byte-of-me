import * as z from 'zod';

/**
 * The image-compression config, shared by the browser pass
 * (`compress-in-browser.ts`) and the server pass (`compress-image.ts`), and
 * stored as part of `WorkspaceSettings.preferences`
 * (`entities/workspace-settings/model/settings-schema.ts`).
 *
 * Lives in `shared/`, not in the `workspace-settings` entity, because both
 * compressors do — Feature-Sliced Design lets an entity import a shared
 * module but never the other way around, and `compress-image.ts` is imported
 * by the server upload action while `compress-in-browser.ts` is imported by a
 * dashboard feature. Defining the shape once here and having
 * `workspace-settings` embed it is what keeps those two call sites and the
 * settings row agreeing on what a "config" is, instead of three copies of the
 * same four fields drifting apart.
 */

export const IMAGE_COMPRESSION_FORMATS = ['webp', 'original'] as const;
export type ImageCompressionFormat = (typeof IMAGE_COMPRESSION_FORMATS)[number];

/**
 * `maxWidth` bounds are generous rather than tight: this is an author-only
 * control, and the real backstop against a silly value is `withoutEnlargement`
 * / the never-upscale rule in `image-compression-rules.ts`, not a narrow zod
 * range. 8192 covers anything a phone or DSLR produces on its longest edge.
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

export type ImageCompressionConfig = z.infer<typeof imageCompressionConfigSchema>;

/**
 * What every workspace starts with, and what an unreadable/missing config
 * falls back to. 2048px at quality 82 is a common "looks lossless, is not"
 * point for photographic content; `webp` because every browser this app
 * targets decodes it and it beats jpeg at the same visual quality.
 */
export const IMAGE_COMPRESSION_DEFAULTS: ImageCompressionConfig = {
  enabled: true,
  maxWidth: 2048,
  quality: 82,
  format: 'webp',
};
