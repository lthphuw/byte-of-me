import { cuidSchema } from '@byte-of-me/api-core';
import * as z from 'zod';

/**
 * `blogId` must be a plain id: `{ not: '' }` would read as a Prisma filter and
 * match every blog's comments, drafts included.
 */
export const publicCommentsParamsSchema = z.object({
  blogId: cuidSchema,
});
