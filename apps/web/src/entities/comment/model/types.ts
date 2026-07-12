import type { Prisma } from '@byte-of-me/db';

import { CACHE_TAGS } from '@/shared/lib/constants';

export type AdminComment = Prisma.CommentGetPayload<{
  include: {
    user: { select: { id: true; name: true; email: true; image: true } };
    blog: {
      select: {
        id: true;
        slug: true;
        translations: { select: { language: true; title: true } };
      };
    };
    project: {
      select: {
        id: true;
        translations: { select: { language: true; title: true } };
      };
    };
  };
}>;

export interface PublicComment {
  id: string;
  createdAt: Date;
  content: string;
  userReplied?: Maybe<string>;
  parentId?: Maybe<string>;
  blogId?: Maybe<string>;
  user: {
    id: string;
    name: string;
  };
  children?: PublicComment[];
}
export const commentKey = (blogId: string, limit: number) => [
  CACHE_TAGS.COMMENT,
  blogId,
  limit,
];
