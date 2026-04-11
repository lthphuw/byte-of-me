import { getPaginatedMedia } from '@/entities/media/api/get-paginated-media';
import { useInfiniteQuery } from '@tanstack/react-query';

export function useMediaInfiniteQuery(limit: number = 12) {
  return useInfiniteQuery({
    queryKey: ['media', limit],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getPaginatedMedia({
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
