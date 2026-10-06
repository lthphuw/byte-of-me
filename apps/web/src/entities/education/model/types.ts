import type { Prisma } from '@byte-of-me/db/types';

import type { Media } from '@/shared/types/models';

/**
 * The editor's full entry. Achievement bodies and images live here only: the
 * list row below never carries them, so the dialog loads this by id instead of
 * reusing the row as `initialData`.
 */
export type AdminEducation = Prisma.EducationGetPayload<{
  include: {
    translations: {
      select: { id: true; language: true; title: true; description: true };
    };
    achievements: {
      include: {
        translations: {
          select: { id: true; language: true; title: true; content: true };
        };
        images: { select: { mediaId: true } };
      };
    };
  };
}>;

/**
 * One row of the paginated admin list: what the card renders (logo, title,
 * dates, achievement count) and nothing nested below it.
 */
export type AdminEducationListItem = Prisma.EducationGetPayload<{
  include: {
    logo: { select: { url: true } };
    translations: {
      select: { id: true; language: true; title: true };
    };
    _count: { select: { achievements: true } };
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
