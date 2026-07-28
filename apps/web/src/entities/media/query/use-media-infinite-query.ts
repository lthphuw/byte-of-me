'use client';

import { getPaginatedMedia } from '@/entities/media/api/get-paginated-media';
import { mediaKeys } from '@/entities/media/model/query-keys';
import { useInfiniteListQuery } from '@/shared/hooks/use-infinite-list-query';

export function useMediaInfiniteQuery(limit: number = 12) {
  return useInfiniteListQuery({
    queryKey: mediaKeys.infinite(limit),
    fetchPage: (page) => getPaginatedMedia({ page, limit }),
  });
}
