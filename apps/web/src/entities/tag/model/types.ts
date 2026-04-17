import type { Prisma } from '@byte-of-me/db';

import type { Tag } from '@/shared/types/models';

export type AdminTag = Prisma.TagGetPayload<{
  include: {
    translations: true;
  };
}>;

export type PublicTag = Tag;
