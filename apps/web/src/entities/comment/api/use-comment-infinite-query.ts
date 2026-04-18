import { useInfiniteQuery } from '@tanstack/react-query';

import { getPaginatedPublicCommentForBlog } from '@/entities';

export function useCommentInfiniteQuery(blogId: string, limit: number = 8) {
  return useInfiniteQuery({
    queryKey: ['comment-list', blogId, limit],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getPaginatedPublicCommentForBlog({
        page: pageParam as number,
        limit,
        blogId,
      });

      if (!response.success) throw new Error(response.errorMsg);
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage?.meta.hasMore
        ? lastPage?.meta.currentPage + 1
        : undefined;
    },
    initialPageParam: 1,
  });
}
