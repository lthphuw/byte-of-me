import type { Prisma } from '@byte-of-me/db';

import type { Media, Project, Tag } from '@/shared/types/models';

export type AdminBlog = Prisma.BlogGetPayload<{
  include: {
    coverImage: true;
    translations: true;
    project: {
      include: {
        translations: true;
      };
    };
    tags: {
      include: {
        tag: {
          include: {
            translations: true;
          };
        };
      };
    };
  };
}>;

export interface PublicBlog {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  slug: string;
  publishedDate?: Maybe<Date>;
  isPublished: boolean;

  title: string;
  description?: Maybe<string>;
  content: string;

  readingTime?: Maybe<number>;

  project?: Maybe<Project>;
  coverImage?: Maybe<Media>;
  tags: Tag[];

  views?: number;
  avgReadingTime?: number;
}
