'use client';

import {
  type InfiniteListQueryBehavior,
  useInfiniteListQuery,
} from '@byte-of-me/query';

import { commentQueries } from '@/entities/comment/query/comment-queries';

export function useCommentInfiniteQuery(
  blogId: string,
  limit: number = 8,
  options?: InfiniteListQueryBehavior
) {
  return useInfiniteListQuery({
    ...commentQueries.threadInfinite(blogId, limit),
    ...options,
  });
}
