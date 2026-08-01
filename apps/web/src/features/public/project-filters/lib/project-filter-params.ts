import { parseSlugListParam } from '@/shared/lib/filter-params';

export interface ProjectFilterState {
  tagSlugs: string[];
  techStackSlugs: string[];
  search: string;
}

/**
 * Mirrors the unfiltered first page rendered server-side in `projects/page.tsx`.
 *
 * No `'use client'` directive here on purpose — see the same note on
 * `DEFAULT_BLOG_FILTERS`: exported from a client module, this object reached
 * the server prefetch as a client-reference proxy and the query hash drifted
 * from the browser's, so the prerendered page shipped "No projects".
 */
export const DEFAULT_PROJECT_FILTERS: ProjectFilterState = {
  tagSlugs: [],
  techStackSlugs: [],
  search: '',
};

/** Reads the project filter facets out of the URL query. */
export function parseProjectFilters(
  params: URLSearchParams
): ProjectFilterState {
  return {
    tagSlugs: parseSlugListParam(params, 'tags'),
    techStackSlugs: parseSlugListParam(params, 'tech'),
    search: params.get('q') || '',
  };
}

/**
 * Serialises filters + page back into a query string. Defaults are omitted so
 * the unfiltered first page stays on a clean `/projects` URL.
 */
export function buildProjectFilterQuery(
  filters: ProjectFilterState,
  page: number
): string {
  const params = new URLSearchParams();
  if (filters.tagSlugs.length > 0)
    params.set('tags', filters.tagSlugs.join(','));
  if (filters.techStackSlugs.length > 0)
    params.set('tech', filters.techStackSlugs.join(','));
  if (filters.search) params.set('q', filters.search);
  if (page > 1) params.set('page', String(page));

  return params.toString();
}
