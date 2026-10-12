'use client';

import { MEDIA_PAGE_SIZE, mediaQueries } from '@/entities/media/query/media-queries';
import { useInfiniteListQuery } from '@/shared/hooks/use-infinite-list-query';

export function useMediaInfiniteQuery(limit: number = MEDIA_PAGE_SIZE) {
  return useInfiniteListQuery(mediaQueries.infinite(limit));
}
