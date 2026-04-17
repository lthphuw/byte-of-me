import type { Prisma } from '@byte-of-me/db';

import type { Project } from '@/shared/types/models';

export type AdminProject = Prisma.ProjectGetPayload<{
  include: {
    translations: true;
    techStacks: true;
    tags: {
      include: {
        tag: {
          include: {
            translations: true;
          };
        };
      };
    };
  };
}>;

export type PublicProject = Project;
