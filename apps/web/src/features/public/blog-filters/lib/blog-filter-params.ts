import { parseSlugListParam } from '@/shared/lib/filter-params';

export interface BlogFilterState {
  tagSlugs: string[];
  search: string;
}

/**
 * Mirrors the unfiltered first page rendered server-side in `blogs/page.tsx`.
 *
 * This module deliberately carries **no** `'use client'` directive. The
 * constant lived next to `useBlogFilters` until the RSC graph replaced it with
 * a client-reference proxy on the server: `blogKeys.publicList(1, proxy)`
 * hashed to `["blog","public-list",1,null]` while the browser computed
 * `[...,{"search":"","tagSlugs":[]}]`, so the prefetch was never read and the
 * prerendered HTML shipped "No posts". Keep the server page's import path
 * pointing at a plain module.
 */
export const DEFAULT_BLOG_FILTERS: BlogFilterState = {
  tagSlugs: [],
  search: '',
};

/** Reads the blog filter facets out of the URL query. */
export function parseBlogFilters(params: URLSearchParams): BlogFilterState {
  return {
    tagSlugs: parseSlugListParam(params, 'tags'),
    search: params.get('q') || '',
  };
}

/**
 * Serialises filters + page back into a query string. Defaults are omitted so
 * the unfiltered first page stays on a clean `/blogs` URL.
 */
export function buildBlogFilterQuery(
  filters: BlogFilterState,
  page: number
): string {
  const params = new URLSearchParams();
  if (filters.tagSlugs.length > 0)
    params.set('tags', filters.tagSlugs.join(','));
  if (filters.search) params.set('q', filters.search);
  if (page > 1) params.set('page', String(page));

  return params.toString();
}
