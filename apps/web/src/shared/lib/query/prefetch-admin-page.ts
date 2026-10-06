import { dehydrate, type DehydratedState } from '@tanstack/react-query';

import { ADMIN_PAGE_SIZE } from './admin-list';
import { getQueryClient } from './get-query-client';
import { unwrapApiResponse } from './unwrap-api-response';

import type { ApiResponse } from '@/shared/types/api/api-response.type';
import type { PaginatedData } from '@/shared/types/api/paginated-api.type';

/**
 * Page 1 of a manager, dehydrated for a `HydrationBoundary`. Takes the same
 * `pageKey` and `fetchPage` as `useCrudManager` so key and value cannot drift;
 * a failed read is not dehydrated and the client refetches.
 */
export async function prefetchAdminPage<T>(
  pageKey: (page: number) => readonly unknown[],
  fetchPage: (
    page: number,
    limit: number
  ) => Promise<ApiResponse<PaginatedData<T>>>
): Promise<DehydratedState> {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: pageKey(1),
    queryFn: async () => unwrapApiResponse(await fetchPage(1, ADMIN_PAGE_SIZE)),
  });
  return dehydrate(queryClient);
}
