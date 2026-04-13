import type { Media } from '@/shared/types/models';

import type { Prisma } from 'node_modules/@byte-of-me/db/generated/prisma/client';

export type AdminEducation = Prisma.EducationGetPayload<{
  include: {
    logo: true;
    translations: true;
    achievements: {
      include: {
        translations: true;
        images: true;
      };
    };
  };
}>;

export interface PublicEducationAchievement {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  sortOrder: number;
  title: string;
  content: Maybe<string>;
  images: Media[];
}

export interface PublicEducation {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  title: string;
  description: Maybe<string>;
  startDate: Date;
  endDate: Maybe<Date>;
  logo: Maybe<Media>;
  achievements: PublicEducationAchievement[];
}
