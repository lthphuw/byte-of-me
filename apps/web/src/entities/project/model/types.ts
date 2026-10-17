import type { Prisma } from '@byte-of-me/db/types';

import type { Project } from '@/shared/types/models';

export type AdminProject = Prisma.ProjectGetPayload<{
  include: {
    translations: {
      select: {
        id: true;
        language: true;
        title: true;
        description: true;
      };
    };
    techStacks: true;
    tags: {
      include: {
        tag: {
          include: {
            translations: {
              select: {
                id: true;
                language: true;
                name: true;
              };
            };
          };
        };
      };
    };
    coauthors: {
      include: {
        coauthor: true;
      };
    };
  };
}>;

export type PublicProject = Project;
