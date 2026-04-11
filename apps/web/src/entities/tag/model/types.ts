import { Prisma } from 'node_modules/@byte-of-me/db/generated/prisma/client';

export type AdminTag = Prisma.TagGetPayload<{
  include: {
    translations: true;
  };
}>;


export interface PublicTag {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  name: string;
  slug: string;
}
