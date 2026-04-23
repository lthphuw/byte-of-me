import { CACHE_TAGS } from '@/shared/lib/constants';

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
    email: string;
  };
  children?: PublicComment[];
}
export const commentKey = (blogId: string, limit: number) => [
  CACHE_TAGS.COMMENT,
  blogId,
  limit,
];
