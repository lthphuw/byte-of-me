import { clampPagination } from '@/shared/lib/pagination';

/**
 * How a filter change should enter the browser history.
 *
 * `push` for discrete intents (tag/tech toggle, pagination, reset) so Back
 * undoes them; `replace` for the debounced search write, where every pause
 * longer than the debounce would otherwise mint an entry per partial word.
 */
export type FilterHistoryMode = 'push' | 'replace';

export interface FilterNavigationOptions {
  /** Defaults to `push` — the undoable case is the common one. */
  history?: FilterHistoryMode;
}

/**
 * Picks the history mode for a debounced search write.
 *
 * The boundary transitions — no search → search, and search → no search — are
 * discrete intents the user can name ("I started searching", "I cleared it"),
 * so they get a `push` and Back undoes them. Without that, the first write
 * replaced the clean `/blogs` entry and Back from `/blogs?q=react` left the
 * list entirely instead of returning to it.
 *
 * Refining a term that is already in the URL (`rea` → `reac`) stays on
 * `replace`: that is one continuous gesture, and a slow typist would otherwise
 * mint a Back stop per partial word.
 */
export function searchHistoryMode(
  current: string,
  next: string
): FilterHistoryMode {
  return (current.length === 0) === (next.length === 0) ? 'replace' : 'push';
}

/**
 * Reads a slug list from the query string.
 *
 * The filters serialise as a comma-joined list (`?tags=a,b`), but a hand-written
 * or hand-edited URL may repeat the param (`?tags=a&tags=b`); `get()` would
 * silently drop everything after the first occurrence, so read them all and
 * flatten. Empty segments (`?tags=`, `?tags=,,`) yield an empty list rather
 * than `['']`, which would filter out every row.
 */
export function parseSlugListParam(
  params: URLSearchParams,
  key: string
): string[] {
  return params
    .getAll(key)
    .flatMap((value) => value.split(','))
    .map((slug) => slug.trim())
    .filter(Boolean);
}

/**
 * Reads `?page=` defensively: a caller-controlled URL may carry `abc`, `-5`,
 * `2.7` or nothing at all, and none of those may reach a query key as `NaN`.
 * `clampPagination` is the same bound the server action applies, so the client
 * key and the eventual fetch always agree.
 */
export function parsePageParam(params: URLSearchParams, key = 'page'): number {
  const raw = params.get(key);
  const parsed = raw === null ? undefined : Number(raw);

  return clampPagination({ page: parsed }).page;
}
