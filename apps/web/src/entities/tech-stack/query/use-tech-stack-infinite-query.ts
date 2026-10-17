'use client';

import type { InfiniteListQueryBehavior } from '@byte-of-me/query';
import { useInfiniteQuery } from '@tanstack/react-query';

import { techStackQueries } from '@/entities/tech-stack/query/tech-stack-queries';

export function useTechStackInfiniteQuery(
  limit: number = 12,
  options?: InfiniteListQueryBehavior
) {
  return useInfiniteQuery({ ...techStackQueries.infinite(limit), ...options });
}
