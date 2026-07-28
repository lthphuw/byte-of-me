'use client';

import { getPaginatedPublicCommentsForBlog } from '@/entities/comment/api/get-paginated-public-comments-for-blog';
import { commentKey } from '@/entities/comment/model';
import { useInfiniteListQuery } from '@/shared/hooks/use-infinite-list-query';

export function useCommentInfiniteQuery(blogId: string, limit: number = 8) {
  return useInfiniteListQuery({
    queryKey: commentKey(blogId, limit),
    fetchPage: (page) =>
      getPaginatedPublicCommentsForBlog({ page, limit, blogId }),
  });
}
