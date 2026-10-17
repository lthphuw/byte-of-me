import { clampPagination } from './pagination';

/**
 * `push` for discrete intents (toggle, pagination, reset) so Back undoes them;
 * `replace` for the debounced search write, which would mint an entry per word.
 */
export type FilterHistoryMode = 'push' | 'replace';

export interface FilterNavigationOptions {
  /** Defaults to `push` — the undoable case is the common one. */
  history?: FilterHistoryMode;
}

/**
 * History mode for a debounced search write: starting or clearing a search
 * pushes (Back returns to the clean list); refining a term replaces, as one
 * gesture.
 */
export function searchHistoryMode(
  current: string,
  next: string
): FilterHistoryMode {
  return (current.length === 0) === (next.length === 0) ? 'replace' : 'push';
}

/**
 * Reads a slug list, comma-joined (`?tags=a,b`) or repeated (`?tags=a&tags=b`,
 * which `get()` would truncate). Empty segments give `[]`, not `['']`, which
 * would filter out every row.
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
 * Reads `?page=` defensively: `abc`, `-5` or `2.7` must never reach a query key
 * as `NaN`. `clampPagination` is the server action's bound, so the keys agree.
 */
export function parsePageParam(params: URLSearchParams, key = 'page'): number {
  const raw = params.get(key);
  const parsed = raw === null ? undefined : Number(raw);

  return clampPagination({ page: parsed }).page;
}
