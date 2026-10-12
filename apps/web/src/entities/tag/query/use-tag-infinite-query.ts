'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import { tagQueries } from '@/entities/tag/query/tag-queries';
import type { InfiniteListQueryBehavior } from '@/shared/hooks/use-infinite-list-query';

export function useTagInfiniteQuery(
  limit: number = 12,
  options?: InfiniteListQueryBehavior
) {
  return useInfiniteQuery({ ...tagQueries.infinite(limit), ...options });
}
