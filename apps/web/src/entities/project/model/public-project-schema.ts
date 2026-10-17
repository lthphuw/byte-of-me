import { searchTextSchema, slugListSchema } from '@byte-of-me/api-core';
import * as z from 'zod';

/** Filter half of `getPaginatedPublicProjects`'s params; `clampPagination` bounds the rest. */
export const publicProjectsParamsSchema = z.object({
  tagSlugs: slugListSchema.optional(),
  techStackSlugs: slugListSchema.optional(),
  search: searchTextSchema.optional(),
});
