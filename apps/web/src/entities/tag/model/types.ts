import type { Prisma } from '@byte-of-me/db/types';

import type { Tag } from '@/shared/types/models';

export type AdminTag = Prisma.TagGetPayload<{
  include: {
    translations: {
      select: {
        id: true;
        language: true;
        name: true;
      };
    };
  };
}>;

export type PublicTag = Tag;
