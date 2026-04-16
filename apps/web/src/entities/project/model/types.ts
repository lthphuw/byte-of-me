import type { Prisma } from 'node_modules/@byte-of-me/db/generated/prisma/client';

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
