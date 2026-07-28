'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

export type InfiniteListQueryOptions<T> = {
  /** Query key from the entity's key factory — never an inline array. */
  queryKey: readonly unknown[];
  /** Server action returning one page of the list. */
  fetchPage: (page: number) => Promise<ApiResponse<PaginatedData<T>>>;
  enabled?: boolean;
};

/**
 * Shared wrapper around `useInfiniteQuery` for the paginated public/admin
 * lists: unwraps `ApiResponse`, advances the page cursor from
 * `meta.hasMore`/`meta.currentPage`, and starts at page 1.
 */
export function useInfiniteListQuery<T>({
  queryKey,
  fetchPage,
  enabled,
}: InfiniteListQueryOptions<T>) {
  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetchPage(pageParam as number);
      if (!response.success) throw new Error(response.errorMsg);
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage?.meta.hasMore
        ? lastPage?.meta.currentPage + 1
        : undefined;
    },
    initialPageParam: 1,
    enabled,
  });
}
