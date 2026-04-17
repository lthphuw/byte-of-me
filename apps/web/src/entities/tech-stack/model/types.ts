import type { Prisma } from '@byte-of-me/db';

import type { TechStack } from '@/shared/types/models';

export type AdminTechStack = Prisma.TechStackGetPayload<{
  include: {
    logo: true;
  };
}>;

export type PublicTechStack = TechStack
