import type { Media } from '@/entities/media/model/types';
import type { PublicProject } from '@/entities/project/model/types';
import type { PublicTag } from '@/entities/tag/model/types';

import type { Prisma } from '../../../../../../packages/db/generated/prisma/client';

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

  project?: Maybe<PublicProject>;
  coverImage?: Maybe<Media>;
  tags: PublicTag[];
}
