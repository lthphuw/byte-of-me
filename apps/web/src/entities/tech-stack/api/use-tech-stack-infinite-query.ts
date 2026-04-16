import { useInfiniteQuery } from '@tanstack/react-query';

import { getPaginatedPublicTechStacks } from '@/entities/tech-stack/api/get-paginated-public-tech-stacks';
import { CACHE_TAGS } from '@/shared/lib/constants';

export function useTechStackInfiniteQuery(limit: number = 12) {
  return useInfiniteQuery({
    queryKey: [CACHE_TAGS.TECH, limit],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getPaginatedPublicTechStacks({
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
