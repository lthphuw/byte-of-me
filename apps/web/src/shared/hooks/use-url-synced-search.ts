'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce } from '@byte-of-me/ui';

import type { FilterHistoryMode } from '@/shared/lib/filter-params';
import { searchHistoryMode } from '@/shared/lib/filter-params';

/** One typing pause. Long enough to swallow a word, short enough to feel live. */
export const SEARCH_DEBOUNCE_MS = 400;

export interface UseUrlSyncedSearchParams {
  /** The term the URL currently carries — the single source of truth. */
  urlSearch: string;
  /** Called once per typing pause, never for a term the URL already holds. */
  onCommit: (search: string, history: FilterHistoryMode) => void;
  /** Overridable so specs do not have to wait 400 ms per keystroke. */
  delay?: number;
}

export interface UrlSyncedSearch {
  /** What the input shows. Always the user's latest keystroke. */
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  /**
   * Clears the box for a filter reset that writes the URL itself. Marks the
   * empty term as already written, so neither the debounce nor the echo of
   * that navigation writes it a second time.
   */
  resetSearch: () => void;
}

/**
 * A search box whose term lives in the URL: local state for responsiveness, a
 * debounced write out, and a re-sync back in for back/forward navigation.
 *
 * The whole difficulty is that the write and the re-sync are the same value
 * travelling in opposite directions, and the URL write is asynchronous — the
 * App Router transition commits tens to hundreds of milliseconds after
 * `onCommit`. A naive `useEffect(() => setSearch(urlSearch), [urlSearch])`
 * therefore eats keystrokes: type `rea`, pause past the debounce, type `c`,
 * and the echo of the `rea` write lands on `reac` and reverts the box to
 * `rea` — silently, caret jumping to the end.
 *
 * `lastWritten` is what distinguishes the two cases. It holds the term this
 * hook last handed to the URL, so an incoming `urlSearch` equal to it is
 * merely the echo of our own write and is ignored; anything else came from
 * outside this component — a back/forward navigation, an in-app `?q=` link, a
 * filter reset — and wins over the local state.
 *
 * The same ref guards the write: it is the answer to "have I already written
 * this term?", which is `false` on mount (it is seeded from the URL), so the
 * first render cannot rewrite `/blogs?tags=react&page=3` to page 1.
 */
export function useUrlSyncedSearch({
  urlSearch,
  onCommit,
  delay = SEARCH_DEBOUNCE_MS,
}: UseUrlSyncedSearchParams): UrlSyncedSearch {
  const [search, setSearch] = useState(urlSearch);
  const [debounced] = useDebounce(search, delay);

  const lastWritten = useRef(urlSearch);

  // Read only inside the write effect, which deliberately does not re-run when
  // the parent re-renders, so it must not close over a stale callback.
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  useEffect(() => {
    if (urlSearch === lastWritten.current) return;

    lastWritten.current = urlSearch;
    setSearch(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    if (debounced === lastWritten.current) return;

    const history = searchHistoryMode(lastWritten.current, debounced);
    lastWritten.current = debounced;
    onCommitRef.current(debounced, history);
  }, [debounced]);

  const resetSearch = useCallback(() => {
    lastWritten.current = '';
    setSearch('');
  }, []);

  return { search, setSearch, resetSearch };
}
