import { unwrapApiResponse } from '@byte-of-me/api-core';
import { tagKeys } from '@byte-of-me/contracts/tag';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { getAdminTagById } from '@/entities/tag/api/get-admin-tag-by-id';
import { getAdminTagOptions } from '@/entities/tag/api/get-admin-tag-options';
import { getPaginatedAdminTags } from '@/entities/tag/api/get-paginated-admin-tags';
import { getPaginatedPublicTags } from '@/entities/tag/api/get-paginated-public-tags';
import { ADMIN_PAGE_SIZE } from '@/shared/lib/query/admin-list';

export const tagQueries = {
  /** Admin tags for a picker, resolved in `locale`. */
  options: (locale: string) =>
    queryOptions({
      queryKey: tagKeys.options(locale),
      queryFn: async () => unwrapApiResponse(await getAdminTagOptions()),
    }),
  /** The public chip row. Pages are `limit` tags each; `hasMore` drives "See more". */
  infinite: (limit: number) =>
    infiniteQueryOptions({
      queryKey: tagKeys.infinite(limit),
      queryFn: async ({ pageParam }) =>
        unwrapApiResponse(
          await getPaginatedPublicTags({ page: pageParam, limit })
        ),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined,
    }),
  /** One page of the manager list. The server prefetch and `useCrudManager` share this key. */
  adminPage: (page: number) =>
    queryOptions({
      queryKey: tagKeys.adminPage(page),
      queryFn: async () =>
        unwrapApiResponse(await getPaginatedAdminTags(page, ADMIN_PAGE_SIZE)),
    }),
  /** The full record the edit dialog loads. */
  adminById: (id: string) =>
    queryOptions({
      queryKey: tagKeys.detail(id),
      queryFn: async () => unwrapApiResponse(await getAdminTagById(id)),
    }),
};
