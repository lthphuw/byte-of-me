'use client';

import type { InfiniteListQueryBehavior } from '@byte-of-me/query';
import { useInfiniteQuery } from '@tanstack/react-query';

import { tagQueries } from '@/entities/tag/query/tag-queries';

export function useTagInfiniteQuery(
  limit: number = 12,
  options?: InfiniteListQueryBehavior
) {
  return useInfiniteQuery({ ...tagQueries.infinite(limit), ...options });
}
