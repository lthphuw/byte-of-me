import { Media } from '@/entities/media/model/types';
import { Prisma } from 'node_modules/@byte-of-me/db/generated/prisma/client';

export type AdminTechStack = Prisma.TechStackGetPayload<{
  include: {
    logo: true;
  };
}>;

export interface PublicTechStack {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  name: string;
  slug: string;
  group: string;
  sortOrder: number;
  logo: Maybe<Media>;
  userId: string;
};
