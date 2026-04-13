import type { Tag } from '@/shared/types/models';

import type { Prisma } from 'node_modules/@byte-of-me/db/generated/prisma/client';

export type AdminTag = Prisma.TagGetPayload<{
  include: {
    translations: true;
  };
}>;

export type PublicTag = Tag;
