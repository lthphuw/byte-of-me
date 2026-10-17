import { isRichTextBlank } from '@byte-of-me/rich-text-schema/rich-text-content';
import { z } from 'zod';

// Optional in every language: only the title is required. `parseInput` and the
// client resolver both run this, so the transform is the one place a blank body
// becomes `null`; the outer `.optional()` keeps the key optional in the type.
const detailsSchema = z
  .string()
  .nullable()
  .transform((value) => (value && !isRichTextBlank(value) ? value : null))
  .optional();

/** The demo is a side-by-side pair: one slot per item. */
export const FEATURED_WORK_MEDIA_MAX = 2;
export const FEATURED_WORK_MEDIA_LABEL_MAX_LENGTH = 24;

/** A card gathers at most this many proof links (PRs, commits, posts). */
export const FEATURED_WORK_LINKS_MAX = 6;
export const FEATURED_WORK_LINK_LABEL_MAX_LENGTH = 24;
const FEATURED_WORK_URL_MAX_LENGTH = 2048;

// '' (an emptied input) and whitespace both mean "no label"; stored as null.
// Shared by the demo labels and the link labels, which have the same rule.
const tagLabelSchema = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'validation.tooLong')
    .nullable()
    .transform((value) => value || null)
    .optional();

export const featuredWorkMediaItemSchema = z.object({
  mediaId: z.string().min(1, 'validation.required'),
  label: tagLabelSchema(FEATURED_WORK_MEDIA_LABEL_MAX_LENGTH),
});

// A link is required to have a url: an emptied row in the form is a validation error,
// not a silently dropped row. Only http(s) is accepted, as the homepage only renders those.
export const featuredWorkLinkSchema = z.object({
  id: z.string().optional(),
  url: z
    .string()
    .trim()
    .min(1, 'validation.required')
    .max(FEATURED_WORK_URL_MAX_LENGTH, 'validation.tooLong')
    .refine((v) => /^https?:\/\/\S+$/i.test(v), 'validation.invalidUrl'),
  label: tagLabelSchema(FEATURED_WORK_LINK_LABEL_MAX_LENGTH),
});

export const featuredWorkTranslationSchema = z.object({
  id: z.string().optional(),
  language: z.string().min(1),
  title: z
    .string()
    .trim()
    .min(1, 'validation.required')
    .max(120, 'validation.tooLong'),
  details: detailsSchema,
});

export const featuredWorkSchema = z.object({
  id: z.string().optional(),
  // Omitted = keep the stored links, [] = clear them (see `updateFeaturedWork`).
  // A link's `sortOrder` is its array position, so it is not part of the input.
  links: z
    .array(featuredWorkLinkSchema)
    .max(FEATURED_WORK_LINKS_MAX, 'validation.tooManyItems')
    // The same PR twice in one card reads as a mistake. The DB key is (work, position).
    .refine(
      (list) => new Set(list.map((item) => item.url)).size === list.length,
      'validation.duplicateLink'
    )
    .optional(),
  // Omitted = keep the stored pair, [] = clear it (see `updateFeaturedWork`).
  // A slot's `sortOrder` is its array position, so it is not part of the input.
  media: z
    .array(featuredWorkMediaItemSchema)
    .max(FEATURED_WORK_MEDIA_MAX, 'validation.tooManyItems')
    // The primary key is (work, media): one file cannot fill both slots.
    .refine(
      (list) => new Set(list.map((item) => item.mediaId)).size === list.length,
      'validation.duplicateMedia'
    )
    .optional(),
  translations: z
    .array(featuredWorkTranslationSchema)
    .min(1, 'validation.required')
    // The DB is unique on (featuredWorkId, language); catch it here, not as a raw Prisma P2002.
    .refine(
      (list) => new Set(list.map((t) => t.language)).size === list.length,
      'validation.duplicateLanguage'
    )
    // /en is the default locale and the fallback for every other one.
    .refine((list) => list.some((t) => t.language === 'en'), {
      message: 'validation.required',
      path: [0, 'title'],
    }),
});

export type FeaturedWorkFormValues = z.infer<typeof featuredWorkSchema>;
