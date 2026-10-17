'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useMemo } from 'react';
import type {
  FilterHistoryMode,
  FilterNavigationOptions,
} from '@byte-of-me/api-core';
import { parsePageParam } from '@byte-of-me/api-core';
import { useSearchParams } from 'next/navigation';

import type { BlogFilterState } from './blog-filter-params';
import { buildBlogFilterQuery, parseBlogFilters } from './blog-filter-params';

import { usePathname, useRouter } from '@/shared/i18n/navigation';

/**
 * Blog filters and pagination in the URL query (`?tags=a,b&q=...&page=2`), the single source of
 * truth. State shape, defaults and parse/serialise live in `./blog-filter-params` (no
 * `'use client'`), so the server page can share the defaults.
 */
export function useBlogFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(() => parseBlogFilters(searchParams), [searchParams]);
  const page = useMemo(() => parsePageParam(searchParams), [searchParams]);

  const navigate = useCallback(
    (query: string, history: FilterHistoryMode) => {
      const href = query ? `${pathname}?${query}` : pathname;

      // `push` keeps filter changes undoable (`replace` everywhere made Back leave the list);
      // only the debounced search write opts into `replace`.
      if (history === 'replace') router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [router, pathname]
  );

  // Any filter change resets back to page 1 — a stale page number combined
  // with a new filter set could point past the last page of results.
  const updateFilters = useCallback(
    (next: BlogFilterState, options?: FilterNavigationOptions) => {
      navigate(buildBlogFilterQuery(next, 1), options?.history ?? 'push');
    },
    [navigate]
  );

  // Typed as `Dispatch<SetStateAction<number>>` so it can be passed directly
  // to `@byte-of-me/ui`'s `Pagination`, which calls it with an updater
  // function (`setPage((prev) => prev - 1)`), not just a plain number.
  const setPage: Dispatch<SetStateAction<number>> = useCallback(
    (action) => {
      const nextPage = typeof action === 'function' ? action(page) : action;
      navigate(buildBlogFilterQuery(filters, nextPage), 'push');
    },
    [navigate, filters, page]
  );

  return { filters, page, updateFilters, setPage };
}
