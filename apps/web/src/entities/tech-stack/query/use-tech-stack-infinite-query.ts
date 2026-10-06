'use client';

import { getPaginatedPublicTechStacks } from '@/entities/tech-stack/api/get-paginated-public-tech-stacks';
import { techStackKeys } from '@/entities/tech-stack/model/query-keys';
import {
  type InfiniteListQueryBehavior,
  useInfiniteListQuery,
} from '@/shared/hooks/use-infinite-list-query';

export function useTechStackInfiniteQuery(
  limit: number = 12,
  options?: InfiniteListQueryBehavior
) {
  return useInfiniteListQuery({
    queryKey: techStackKeys.infinite(limit),
    fetchPage: (page) => getPaginatedPublicTechStacks({ page, limit }),
    ...options,
  });
}
