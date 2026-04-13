import type { Project } from '@/shared/types/models';

import type { Prisma } from '../../../../../../packages/db/generated/prisma/client';

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
