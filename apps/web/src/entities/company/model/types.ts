import type { Prisma } from '@byte-of-me/db/types';

import type { Media } from '@/shared/types/models';

/**
 * The editor's full record. Roles, tasks and every translation live here only:
 * the list row below never carries them, so the dialog loads this by id
 * instead of reusing the row as `initialData`.
 */
export type AdminCompany = Prisma.CompanyGetPayload<{
  include: {
    translations: {
      select: {
        id: true;
        language: true;
        description: true;
      };
    };
    techStacks: { select: { techStackId: true } };
    roles: {
      include: {
        translations: {
          select: {
            id: true;
            language: true;
            title: true;
            description: true;
          };
        };
        tasks: {
          include: {
            translations: {
              select: {
                id: true;
                language: true;
                content: true;
              };
            };
          };
        };
      };
    };
  };
}>;

/**
 * One row of the paginated admin list: what the card renders (logo, name,
 * location, dates, role and tech-stack counts) and nothing nested below it.
 */
export type AdminCompanyListItem = Prisma.CompanyGetPayload<{
  include: {
    logo: { select: { url: true } };
    _count: { select: { roles: true; techStacks: true } };
  };
}>;

export interface PublicTask {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  sortOrder: number;
  content: string;
}

export interface PublicRole {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  startDate: Maybe<Date>;
  endDate: Maybe<Date>;
  title: Maybe<string>;
  description: Maybe<string>;
  tasks: PublicTask[];
}

export interface PublicCompany {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  company: string;
  location: string;
  description: Maybe<string>;

  startDate: Date;
  endDate: Maybe<Date>;

  logo: Maybe<Media>;
  roles: PublicRole[];
}
