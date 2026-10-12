'use client';

import { commentQueries } from '@/entities/comment/query/comment-queries';
import {
  type InfiniteListQueryBehavior,
  useInfiniteListQuery,
} from '@/shared/hooks/use-infinite-list-query';

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
