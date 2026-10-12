'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import { techStackQueries } from '@/entities/tech-stack/query/tech-stack-queries';
import type { InfiniteListQueryBehavior } from '@/shared/hooks/use-infinite-list-query';

export function useTechStackInfiniteQuery(
  limit: number = 12,
  options?: InfiniteListQueryBehavior
) {
  return useInfiniteQuery({ ...techStackQueries.infinite(limit), ...options });
}
