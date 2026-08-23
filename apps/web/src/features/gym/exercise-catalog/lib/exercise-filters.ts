/**
 * The catalogue's filter shape, and the state it opens on.
 *
 * **No `'use client'` in this file, deliberately.** A server component
 * prefetches `exerciseKeys.list(...)` with these exact values so the first
 * client render hydrates instead of refetching, and a constant imported out of
 * a `'use client'` module does not arrive on the server as a constant — it
 * arrives as a client-reference proxy. The blogs list has the same split for
 * the same reason (`DEFAULT_BLOG_FILTERS` lives in
 * `blog-filters/lib/blog-filter-params`, not in the hook that reads it), and
 * the comment there records what it cost to find out: the key hashed
 * differently on the two sides, nothing raised, and the list sat on skeletons.
 */
export interface ExerciseFilters {
  search: string;
  /** A muscle code, or `''` for "all". Empty string rather than `undefined`
   *  because `exerciseKeys.list` takes a string, and a key holding `undefined`
   *  and one holding `''` are two different keys. */
  muscle: string;
  includeArchived: boolean;
}

/** No search, no muscle, archived hidden — what the screen opens on and the
 *  one combination worth prefetching. */
export const DEFAULT_EXERCISE_FILTERS: ExerciseFilters = {
  search: '',
  muscle: '',
  includeArchived: false,
};
