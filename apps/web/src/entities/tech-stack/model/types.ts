import type { Prisma } from 'node_modules/@byte-of-me/db/generated/prisma/client';

import type { TechStack } from '@/shared/types/models';

export type AdminTechStack = Prisma.TechStackGetPayload<{
  include: {
    logo: true;
  };
}>;

export type PublicTechStack = TechStack
