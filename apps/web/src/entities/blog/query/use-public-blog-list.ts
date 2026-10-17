'use client';

import { HYDRATED_LIST_BEHAVIOR } from '@byte-of-me/query';
import { useQuery } from '@tanstack/react-query';

import { type BlogListFilters, blogQueries } from './blog-queries';

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
