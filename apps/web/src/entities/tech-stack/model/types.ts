import type { TechStack } from '@/shared/types/models';

import type { Prisma } from 'node_modules/@byte-of-me/db/generated/prisma/client';

export type AdminTechStack = Prisma.TechStackGetPayload<{
  include: {
    logo: true;
  };
}>;

export type PublicTechStack = TechStack
