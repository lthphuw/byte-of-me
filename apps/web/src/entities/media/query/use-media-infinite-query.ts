'use client';

import { useInfiniteListQuery } from '@byte-of-me/query';

import { MEDIA_PAGE_SIZE, mediaQueries } from '@/entities/media/query/media-queries';

export function useMediaInfiniteQuery(limit: number = MEDIA_PAGE_SIZE) {
  return useInfiniteListQuery(mediaQueries.infinite(limit));
}
