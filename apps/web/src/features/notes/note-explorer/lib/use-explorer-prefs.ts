'use client';

import { useEffect, useState } from 'react';

import type {
  ExplorerMode,
  FlatSort,
  GroupBy,
} from '@/features/notes/note-explorer/lib/explorer-model';

const STORAGE_KEY = 'byte-of-me:notes-explorer';

export interface ExplorerPrefs {
  mode: ExplorerMode;
  sort: FlatSort;
  groupBy: GroupBy;
}

const DEFAULTS: ExplorerPrefs = { mode: 'tree', sort: 'updated', groupBy: 'status' };

function isPrefs(value: unknown): value is ExplorerPrefs {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    ['tree', 'flat', 'grouped'].includes(candidate.mode as string) &&
    ['updated', 'created', 'title'].includes(candidate.sort as string) &&
    ['status', 'label'].includes(candidate.groupBy as string)
  );
}

/**
 * The explorer's view mode, persisted per browser. Read in an effect, not at
 * init: the first render must match the server HTML (localStorage does not
 * exist there), so everyone starts on the tree for one frame and then snaps
 * to their saved view — a flash the alternative (hydration mismatch) is
 * strictly worse than.
 */
export function useExplorerPrefs() {
  const [prefs, setPrefs] = useState<ExplorerPrefs>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (isPrefs(parsed)) setPrefs(parsed);
    } catch {
      // Corrupt storage falls back to defaults; never crash the sidebar.
    }
  }, []);

  // The write is OUTSIDE the updater. A `setState` updater has to be a pure
  // function of its argument — React is free to call it more than once for a
  // single update (it does, under StrictMode) and to discard the result of a
  // render it decides to throw away, so a `localStorage.setItem` in there is
  // a side effect on a code path with no guarantee about how often it runs.
  // Merging against `prefs` from this render instead gives the write exactly
  // one occurrence per call, which is what it means.
  const update = (next: Partial<ExplorerPrefs>) => {
    const merged = { ...prefs, ...next };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // Quota/staleness — the in-memory pref still applies this session.
    }
    setPrefs(merged);
  };

  return { prefs, update };
}
