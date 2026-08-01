import type { Prisma } from '@byte-of-me/db/types';

import type { Media } from '@/shared/types/models';

export type AdminCompany = Prisma.CompanyGetPayload<{
  include: {
    logo: true;
    translations: {
      select: {
        id: true;
        language: true;
        description: true;
      };
    };
    techStacks: true;
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
