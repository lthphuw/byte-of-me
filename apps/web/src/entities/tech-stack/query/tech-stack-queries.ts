import { unwrapApiResponse } from '@byte-of-me/api-core';
import { techStackKeys } from '@byte-of-me/contracts/tech-stack';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { getAdminTechStackById } from '@/entities/tech-stack/api/get-admin-tech-stack-by-id';
import { getAllAdminTechStack } from '@/entities/tech-stack/api/get-all-admin-tech-stacks';
import { getPaginatedPublicTechStacks } from '@/entities/tech-stack/api/get-paginated-public-tech-stacks';

export const techStackQueries = {
  /** The full admin list as picker options, uncapped (see `getAllAdminTechStack`). */
  options: () =>
    queryOptions({
      queryKey: techStackKeys.options(),
      queryFn: async () => unwrapApiResponse(await getAllAdminTechStack()),
    }),
  /** The public chip row. Pages are `limit` items each; `hasMore` drives "See more". */
  infinite: (limit: number) =>
    infiniteQueryOptions({
      queryKey: techStackKeys.infinite(limit),
      queryFn: async ({ pageParam }) =>
        unwrapApiResponse(
          await getPaginatedPublicTechStacks({ page: pageParam, limit })
        ),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined,
    }),
  /** The full record the edit dialog loads. */
  adminById: (id: string) =>
    queryOptions({
      queryKey: techStackKeys.detail(id),
      queryFn: async () => unwrapApiResponse(await getAdminTechStackById(id)),
    }),
};
