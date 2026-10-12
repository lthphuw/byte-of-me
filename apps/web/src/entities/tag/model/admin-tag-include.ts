import type { Prisma } from '@byte-of-me/db/types';

/**
 * The owner's view of a tag (`AdminTag`), shared by the manager list and the
 * by-id read. Name only: `TagCard` and `TagDialog` render nothing else.
 */
export const adminTagInclude = {
  translations: {
    select: {
      id: true,
      language: true,
      name: true,
    },
  },
} satisfies Prisma.TagInclude;
