'use client';

import { getPaginatedPublicTags } from '@/entities/tag/api/get-paginated-public-tags';
import { tagKeys } from '@/entities/tag/model/query-keys';
import {
  type InfiniteListQueryBehavior,
  useInfiniteListQuery,
} from '@/shared/hooks/use-infinite-list-query';

export function useTagInfiniteQuery(
  limit: number = 12,
  options?: InfiniteListQueryBehavior
) {
  return useInfiniteListQuery({
    queryKey: tagKeys.infinite(limit),
    fetchPage: (page) => getPaginatedPublicTags({ page, limit }),
    ...options,
  });
}
