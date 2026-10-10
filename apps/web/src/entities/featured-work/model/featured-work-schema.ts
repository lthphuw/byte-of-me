import { isRichTextBlank } from '@byte-of-me/ui/lib/rich-text-content';
import { z } from 'zod';

/** Stored TipTap JSON, in characters. A size guard, not a word budget. */
export const FEATURED_WORK_DETAILS_MAX_LENGTH = 32_768;

// Optional in every language, English included: only the title is required.
// `parseInput` and the client resolver both run this, so the transform is the
// one place a blank body becomes `null`. The outer `.optional()` keeps the key
// optional in the inferred type, so forms that do not send it still type-check.
const detailsSchema = z
  .string()
  .max(FEATURED_WORK_DETAILS_MAX_LENGTH, 'Details are too long')
  .nullable()
  .transform((value) => (value && !isRichTextBlank(value) ? value : null))
  .optional();

export const featuredWorkTranslationSchema = z.object({
  id: z.string().optional(),
  language: z.string().min(1),
  title: z.string().trim().min(1, 'Title is required').max(120),
  description: z.string().trim().max(400).nullable().optional(),
  details: detailsSchema,
});

export const featuredWorkSchema = z.object({
  id: z.string().optional(),
  isPublished: z.boolean(),
  // '' is what an emptied input submits; the actions store it as null.
  url: z
    .string()
    .trim()
    .max(2048)
    .refine(
      (v) => v === '' || /^https?:\/\/\S+$/i.test(v),
      'Must be an http(s) URL'
    )
    .nullable()
    .optional(),
  translations: z
    .array(featuredWorkTranslationSchema)
    .min(1)
    // The DB is unique on (featuredWorkId, language); catch it here, not as a raw Prisma P2002.
    .refine(
      (list) => new Set(list.map((t) => t.language)).size === list.length,
      'Each language may appear once'
    )
    // /en is the default locale and the fallback for every other one.
    .refine((list) => list.some((t) => t.language === 'en'), {
      message: 'English title is required',
      path: [0, 'title'],
    }),
});

export type FeaturedWorkFormValues = z.infer<typeof featuredWorkSchema>;
