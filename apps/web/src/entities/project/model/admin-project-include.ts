import type { Prisma } from '@byte-of-me/db/types';

/**
 * The owner's view of a project (`AdminProject`). The manager's list and the
 * by-id read share it, so the edit dialog sees the same fields the list does.
 * Narrow on purpose: the editor reads title and description only, so the
 * timestamps stay out.
 */
export const adminProjectInclude = {
  translations: {
    select: {
      id: true,
      language: true,
      title: true,
      description: true,
    },
  },
  techStacks: true,
  tags: {
    include: {
      tag: {
        include: {
          translations: {
            select: {
              id: true,
              language: true,
              name: true,
            },
          },
        },
      },
    },
  },
  coauthors: {
    include: {
      coauthor: true,
    },
  },
} satisfies Prisma.ProjectInclude;
