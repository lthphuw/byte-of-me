import * as z from 'zod';

export const blogTranslationSchema = z.object({
  language: z.string(),

  title: z.string(),
  description: z.string().nullable().optional(),
  content: z.any(),
});

export const blogFormSchema = z.object({
  slug: z.string(),
  publishedDate: z.date().nullable().optional(),
  isPublished: z.boolean(),

  coverImageId: z.string().nullable().optional(),

  translations: z.array(blogTranslationSchema),
  projectId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
});

export type BlogFormValues = z.infer<typeof blogFormSchema>;
