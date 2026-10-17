import { z } from 'zod';

export const tagTranslationSchema = z.object({
  id: z.string().optional(),
  language: z.string().min(1, 'validation.required'),
  name: z.string().trim().min(1, 'validation.required'),
});

export const tagSchema = z.object({
  id: z.string().optional(),
  slug: z.string().trim().min(1, 'validation.required'),
  translations: z.array(tagTranslationSchema).min(1),
});

export type TagFormValues = z.infer<typeof tagSchema>;
