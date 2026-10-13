import type { Prisma } from '@byte-of-me/db/types';

/**
 * The owner's view of a project (`AdminProject`). The paginated list and the
 * by-id read share it, so the edit dialog sees what the list sees. Translations
 * keep to the fields the editor reads, plus `id`.
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
