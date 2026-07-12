'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import { usePathname, useRouter } from '@/shared/i18n/navigation';

export interface BlogFilterState {
  tagSlugs: string[];
  search: string;
}

/**
 * Blog list filters backed by the URL query (`?tags=a,b&q=...`). The URL is the
 * single source of truth, so filtered lists are shareable/bookmarkable, survive
 * refresh and back/forward, and the tag links from a blog detail page apply
 * immediately.
 */
export function useBlogFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo<BlogFilterState>(
    () => ({
      tagSlugs: searchParams.get('tags')?.split(',').filter(Boolean) || [],
      search: searchParams.get('q') || '',
    }),
    [searchParams]
  );

  const updateFilters = useCallback(
    (next: BlogFilterState) => {
      const params = new URLSearchParams();
      if (next.tagSlugs.length > 0) params.set('tags', next.tagSlugs.join(','));
      if (next.search) params.set('q', next.search);

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [router, pathname]
  );

  return { filters, updateFilters };
}
