import type { Prisma } from '@byte-of-me/db/types';

import type { PublicProject } from '@/entities/project/model/types';
import type { Media, Tag } from '@/shared/types/models';


/**
 * The editor's full post. `translations[]` keeps `content` — the language tabs
 * edit it — but the nested project/tag translations carry only the label each
 * one is read for, so no locale's `@db.Text` description is loaded.
 */
export type AdminBlog = Prisma.BlogGetPayload<{
  include: {
    coverImage: true;
    translations: true;
    project: {
      include: {
        translations: {
          select: {
            id: true;
            language: true;
            title: true;
          };
        };
      };
    };
    tags: {
      include: {
        tag: {
          include: {
            translations: {
              select: {
                id: true;
                language: true;
                name: true;
              };
            };
          };
        };
      };
    };
  };
}>;

/**
 * Shape returned by the paginated admin list. Same as `AdminBlog` except
 * `translations[]` drops `content` (a whole TipTap document, `@db.Text`) —
 * the list card only renders title/description, and loading it for every
 * post on every page view was the actual cost this type removes. The editor
 * dialog fetches the full `AdminBlog` (via `getAdminBlogById`) on demand
 * instead of reusing this list item as its initial data.
 */
export type AdminBlogListItem = Prisma.BlogGetPayload<{
  include: {
    coverImage: true;
    translations: {
      select: {
        id: true;
        language: true;
        title: true;
        description: true;
      };
    };
    project: {
      include: {
        translations: {
          select: {
            id: true;
            language: true;
            title: true;
          };
        };
      };
    };
    tags: {
      include: {
        tag: {
          include: {
            translations: {
              select: {
                id: true;
                language: true;
                name: true;
              };
            };
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
