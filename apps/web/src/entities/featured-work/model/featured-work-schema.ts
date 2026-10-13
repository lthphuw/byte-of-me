import { isRichTextBlank } from '@byte-of-me/ui/lib/rich-text-content';
import { z } from 'zod';

/** Stored TipTap JSON, in characters. A size guard, not a word budget. */
export const FEATURED_WORK_DETAILS_MAX_LENGTH = 32_768;

// Optional in every language, English included: only the title is required.
// `parseInput` and the client resolver both run this, so the transform is the
// one place a blank body becomes `null`. The outer `.optional()` keeps the key
// optional in the inferred type, so forms that do not send it still type-check.
// Every message is a `validation.*` key, translated by the form at display time.
const detailsSchema = z
  .string()
  .max(FEATURED_WORK_DETAILS_MAX_LENGTH, 'validation.tooLong')
  .nullable()
  .transform((value) => (value && !isRichTextBlank(value) ? value : null))
  .optional();

/** The demo is a side-by-side pair: one slot per item. */
export const FEATURED_WORK_MEDIA_MAX = 2;
export const FEATURED_WORK_MEDIA_LABEL_MAX_LENGTH = 24;

// '' (an emptied input) and whitespace both mean "no label"; stored as null.
const mediaLabelSchema = z
  .string()
  .trim()
  .max(FEATURED_WORK_MEDIA_LABEL_MAX_LENGTH, 'validation.tooLong')
  .nullable()
  .transform((value) => value || null)
  .optional();

export const featuredWorkMediaItemSchema = z.object({
  mediaId: z.string().min(1, 'validation.required'),
  label: mediaLabelSchema,
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
  // '' is what an emptied input submits; the actions store it as null.
  url: z
    .string()
    .trim()
    .max(2048, 'validation.tooLong')
    .refine(
      (v) => v === '' || /^https?:\/\/\S+$/i.test(v),
      'validation.invalidUrl'
    )
    .nullable()
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
