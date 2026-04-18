import type { Prisma } from '@byte-of-me/db';

import type { PublicProject } from '@/entities';
import type { Media, Tag } from '@/shared/types/models';

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

  projectId?: Maybe<string>;
  project?: Maybe<Partial<PublicProject>>;

  coverImage?: Maybe<Media>;
  tags: Tag[];

  views?: number;
  avgReadingTime?: number;
}
