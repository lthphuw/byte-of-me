import { useInfiniteQuery } from '@tanstack/react-query';

import { getPaginatedMedia } from '@/entities/media/api/get-paginated-media';
import { CACHE_TAGS } from '@/shared/lib/constants';

export function useMediaInfiniteQuery(limit: number = 12) {
  return useInfiniteQuery({
    queryKey: [CACHE_TAGS.MEDIA, limit],
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
