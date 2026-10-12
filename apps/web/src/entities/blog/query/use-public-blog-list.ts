'use client';

import { useQuery } from '@tanstack/react-query';

import { type BlogListFilters, blogQueries } from './blog-queries';

import { HYDRATED_LIST_BEHAVIOR } from '@/shared/hooks/use-infinite-list-query';

/**
 * One page of the public blog list. The server prefetches page 1 of the
 * unfiltered list, and that entry is never refetched on mount. A filter or
 * page change is a new key and fetches live.
 */
export function usePublicBlogList(
  page: number,
  filters: BlogListFilters,
  includeDrafts = false
) {
  return useQuery({
    ...blogQueries.publicList(page, filters, includeDrafts),
    placeholderData: (previousData) => previousData,
    ...HYDRATED_LIST_BEHAVIOR,
  });
}
