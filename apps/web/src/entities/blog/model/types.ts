import type { Prisma } from '@byte-of-me/db';

import type { PublicProject } from '@/entities/project/model/types';
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

export interface BlogAuthor {
  name: string;
  avatar?: Maybe<string>;
}

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

  author?: Maybe<BlogAuthor>;

  isInteracted?: boolean;
  views?: number;
  avgReadingTime?: number;
}

/** Minimal blog reference for prev/next navigation and related-post lists. */
export interface BlogSummary {
  id: string;
  slug: string;
  title: string;
}
