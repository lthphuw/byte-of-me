import { useInfiniteQuery } from '@tanstack/react-query';

import { getPaginatedPublicTags } from '@/entities/tag/api/get-paginated-public-tags';

export function useTagInfiniteQuery(limit: number = 12) {
  return useInfiniteQuery({
    queryKey: ['tags', limit],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getPaginatedPublicTags({
        page: pageParam as number,
        limit,
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
