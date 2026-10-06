import * as z from 'zod';

import {
  cuidSchema,
  MAX_FILTER_SLUGS,
  searchTextSchema,
  slugListSchema,
  slugSchema,
} from '@/shared/lib/public-input-schema';

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

/** Filter half of `getPaginatedPublicBlogs`'s params; `clampPagination` bounds the rest. */
export const publicBlogsParamsSchema = z.object({
  tagSlugs: slugListSchema.optional(),
  search: searchTextSchema.optional(),
  includeDrafts: z.boolean().optional(),
});

/** Related-post cards are a short strip; nothing here needs more. */
export const MAX_RELATED_BLOGS = 12;

export const relatedPublicBlogsParamsSchema = z.object({
  blogId: cuidSchema,
  // Truncated, not refused: a post with many tags still gets related posts.
  // `.max(50)` only bounds the input parsed before the slice.
  tagSlugs: z
    .array(slugSchema)
    .max(50)
    .transform((slugs) => slugs.slice(0, MAX_FILTER_SLUGS)),
  limit: z
    .number()
    .finite()
    .transform((limit) =>
      Math.min(Math.max(1, Math.floor(limit)), MAX_RELATED_BLOGS)
    ),
});
