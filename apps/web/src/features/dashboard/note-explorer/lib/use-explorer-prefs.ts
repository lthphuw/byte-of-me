'use client';

import { useEffect, useState } from 'react';

import type {
  ExplorerMode,
  FlatSort,
  GroupBy,
} from '@/features/dashboard/note-explorer/lib/explorer-model';

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

  const update = (next: Partial<ExplorerPrefs>) => {
    setPrefs((current) => {
      const merged = { ...current, ...next };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // Quota/staleness — the in-memory pref still applies this session.
      }
      return merged;
    });
  };

  return { prefs, update };
}
