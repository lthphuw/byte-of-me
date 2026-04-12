import type { PublicTag } from '@/entities/tag/model/types';
import type { PublicTechStack } from '@/entities/tech-stack/model/types';

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
export interface PublicProject {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  slug: string;
  githubLink: Maybe<string>;
  liveLink: Maybe<string>;
  startDate: Maybe<Date>;
  endDate: Maybe<Date>;
  isPublished: Maybe<boolean>;
  title: Maybe<string>;
  description: Maybe<string>;

  tags: PublicTag[];
  techStacks: PublicTechStack[];
}
