import { CACHE_TAGS } from '@/shared/lib/constants';

export interface PublicComment {
  id: string;
  createdAt: Date;
  content: string;
  blogId?: Maybe<string>;
  user: {
    name: string;
    email: string;
  };
}
export const commentKey = (blogId: string, limit: number) => [
  CACHE_TAGS.COMMENT,
  blogId,
  limit,
];
