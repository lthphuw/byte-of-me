'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FilterHistoryMode } from '@byte-of-me/api-core';
import { searchHistoryMode } from '@byte-of-me/api-core';
import { useDebounce } from '@byte-of-me/ui-hooks';

/** One typing pause. Long enough to swallow a word, short enough to feel live. */
const SEARCH_DEBOUNCE_MS = 400;

interface UseUrlSyncedSearchParams {
  /** The term the URL currently carries — the single source of truth. */
  urlSearch: string;
  /** Called once per typing pause, never for a term the URL already holds. */
  onCommit: (search: string, history: FilterHistoryMode) => void;
  /** Overridable so specs do not have to wait 400 ms per keystroke. */
  delay?: number;
}

interface UrlSyncedSearch {
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
 * A search box whose term lives in the URL: local state, a debounced write out, a re-sync in
 * for back/forward. `lastWritten` tells the echo of our own write (ignored, or it eats
 * keystrokes) from an outside change (wins), and keeps mount from resetting `?page=3`.
 */
export function useUrlSyncedSearch({
  urlSearch,
  onCommit,
  delay = SEARCH_DEBOUNCE_MS,
}: UseUrlSyncedSearchParams): UrlSyncedSearch {
  const [search, setSearch] = useState(urlSearch);
  const debounced = useDebounce(search, delay);

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
