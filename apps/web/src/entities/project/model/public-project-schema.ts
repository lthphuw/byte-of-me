import * as z from 'zod';

import {
  searchTextSchema,
  slugListSchema,
} from '@/shared/lib/public-input-schema';

/** Filter half of `getPaginatedPublicProjects`'s params; `clampPagination` bounds the rest. */
export const publicProjectsParamsSchema = z.object({
  tagSlugs: slugListSchema.optional(),
  techStackSlugs: slugListSchema.optional(),
  search: searchTextSchema.optional(),
});
