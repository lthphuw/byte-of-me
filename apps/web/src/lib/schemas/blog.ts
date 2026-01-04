import * as z from 'zod';

export const blogSchema = z.object({
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  publishedDate: z.date(),
  projectId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});

export type BlogSchema = z.infer<typeof blogSchema>;
