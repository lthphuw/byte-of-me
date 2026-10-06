import * as z from 'zod';

import { cuidSchema } from '@/shared/lib/public-input-schema';

/**
 * `blogId` must be a plain id: `{ not: '' }` would read as a Prisma filter and
 * match every blog's comments, drafts included.
 */
export const publicCommentsParamsSchema = z.object({
  blogId: cuidSchema,
});
