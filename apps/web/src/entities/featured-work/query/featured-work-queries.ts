import { queryOptions } from '@tanstack/react-query';

import { getAdminFeaturedWorkById } from '@/entities/featured-work/api/get-admin-featured-work-by-id';
import { getPaginatedAdminFeaturedWorks } from '@/entities/featured-work/api/get-paginated-admin-featured-works';
import { featuredWorkKeys } from '@/entities/featured-work/model/query-keys';
import { ADMIN_PAGE_SIZE } from '@/shared/lib/query/admin-list';
import { unwrapApiResponse } from '@/shared/lib/query/unwrap-api-response';

export const featuredWorkQueries = {
  /** One page of the manager list. The server prefetch and `useCrudManager` share this key. */
  adminPage: (page: number) =>
    queryOptions({
      queryKey: featuredWorkKeys.adminPage(page),
      queryFn: async () =>
        unwrapApiResponse(
          await getPaginatedAdminFeaturedWorks(page, ADMIN_PAGE_SIZE)
        ),
    }),
  /** The full row, with its bodies, that the edit dialog loads. */
  adminById: (workId: string) =>
    queryOptions({
      queryKey: featuredWorkKeys.detail(workId),
      queryFn: async () =>
        unwrapApiResponse(await getAdminFeaturedWorkById(workId)),
    }),
};
