import { z } from 'zod';

export const tagTranslationSchema = z.object({
  id: z.string().optional(),
  language: z.string().min(1, 'Language is required'),
  name: z.string().min(1, 'Name is required'),
});

export const tagSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1, 'Slug is required'),
  translations: z.array(tagTranslationSchema).min(1),
});

export type TagFormValues = z.infer<typeof tagSchema>;
