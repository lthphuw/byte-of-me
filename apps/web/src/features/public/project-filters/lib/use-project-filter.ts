'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import type { ProjectFilterState } from './project-filter-params';
import {
  buildProjectFilterQuery,
  parseProjectFilters,
} from './project-filter-params';

import { usePathname, useRouter } from '@/shared/i18n/navigation';
import type {
  FilterHistoryMode,
  FilterNavigationOptions,
} from '@/shared/lib/filter-params';
import { parsePageParam } from '@/shared/lib/filter-params';

/**
 * Project list filters and pagination backed by the URL query
 * (`?tags=a,b&tech=x,y&q=...&page=2`). The URL is the single source of
 * truth, so filtered/paginated views are shareable/bookmarkable and survive
 * refresh and back/forward. Same shape as `useBlogFilters`, with the extra
 * tech-stack facet projects have and page folded in as a fourth param.
 *
 * The state shape, defaults and the URL parse/serialise pair live in
 * `./project-filter-params` — a module without `'use client'`, so the server
 * page can share the defaults without them turning into a client reference.
 */
export function useProjectFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(
    () => parseProjectFilters(searchParams),
    [searchParams]
  );
  const page = useMemo(() => parsePageParam(searchParams), [searchParams]);

  const navigate = useCallback(
    (query: string, history: FilterHistoryMode) => {
      const href = query ? `${pathname}?${query}` : pathname;

      // `push` keeps filter changes undoable — see `useBlogFilters`. Only the
      // debounced search write opts into `replace`.
      if (history === 'replace') router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [router, pathname]
  );

  // Any filter change resets back to page 1 — a stale page number combined
  // with a new filter set could point past the last page of results.
  const updateFilters = useCallback(
    (next: ProjectFilterState, options?: FilterNavigationOptions) => {
      navigate(buildProjectFilterQuery(next, 1), options?.history ?? 'push');
    },
    [navigate]
  );

  // Typed as `Dispatch<SetStateAction<number>>` so it can be passed directly
  // to `@byte-of-me/ui`'s `Pagination`, which calls it with an updater
  // function (`setPage((prev) => prev - 1)`), not just a plain number.
  const setPage: Dispatch<SetStateAction<number>> = useCallback(
    (action) => {
      const nextPage = typeof action === 'function' ? action(page) : action;
      navigate(buildProjectFilterQuery(filters, nextPage), 'push');
    },
    [navigate, filters, page]
  );

  return { filters, page, updateFilters, setPage };
}
