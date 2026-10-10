import { z } from 'zod';

export const featuredWorkTranslationSchema = z.object({
  id: z.string().optional(),
  language: z.string().min(1),
  title: z.string().trim().min(1, 'Title is required').max(120),
  description: z.string().trim().max(400).nullable().optional(),
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
  translations: z.array(featuredWorkTranslationSchema).min(1),
});

export type FeaturedWorkFormValues = z.infer<typeof featuredWorkSchema>;
