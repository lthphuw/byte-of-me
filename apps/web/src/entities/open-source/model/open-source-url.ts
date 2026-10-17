import { Routes } from '@/shared/config/global';

/** `/projects?view=` value that shows the merged-PR ledger instead of the projects. */
export const OPEN_SOURCE_VIEW = 'open-source';

/** `?repo=owner/name` narrows that ledger to one repo. */
export const OPEN_SOURCE_REPO_PARAM = 'repo';

/**
 * The ledger on `/projects`, optionally narrowed to one repo. `view` is always explicit: the
 * router drops a replace to the bare path from `?view=open-source`, so "all repos" keeps it.
 */
export function openSourceHref(repo?: string | null): string {
  const query = new URLSearchParams({ view: OPEN_SOURCE_VIEW });
  if (repo) query.set(OPEN_SOURCE_REPO_PARAM, repo);

  return `${Routes.Projects}?${query}`;
}
