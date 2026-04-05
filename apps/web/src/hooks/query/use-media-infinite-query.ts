import { useInfiniteQuery } from '@tanstack/react-query';

import { getPaginatedMedia } from '@/lib/actions/dashboard/media/get-paginated-media';

export function useMediaInfiniteQuery(limit: number = 12) {
  return useInfiniteQuery({
    queryKey: ['media', limit],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getPaginatedMedia(pageParam as number, limit);
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
