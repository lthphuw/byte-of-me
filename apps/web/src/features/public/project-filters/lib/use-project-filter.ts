'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useMemo } from 'react';
import type {
  FilterHistoryMode,
  FilterNavigationOptions,
} from '@byte-of-me/api-core';
import { parsePageParam } from '@byte-of-me/api-core';
import { useSearchParams } from 'next/navigation';

import type { ProjectFilterState } from './project-filter-params';
import {
  buildProjectFilterQuery,
  parseProjectFilters,
} from './project-filter-params';

import { usePathname, useRouter } from '@/shared/i18n/navigation';

/**
 * Project filters and pagination in the URL query (`?tags=a,b&tech=x,y&q=...&page=2`), the source
 * of truth. Same shape as `useBlogFilters` plus the tech-stack facet. Defaults and parse/serialise
 * live in `./project-filter-params` (no `'use client'`), so the server page can share them.
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
