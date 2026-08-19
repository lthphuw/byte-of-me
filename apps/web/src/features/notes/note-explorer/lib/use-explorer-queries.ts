'use client';

import { useCallback, useMemo } from 'react';
import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  getArchivedNotes,
  getNoteChildren,
  getNoteLabels,
  noteKeys,
  type NotePage,
  type NoteTreeNode,
} from '@/entities/note';
import type { ExplorerMode } from '@/features/notes/note-explorer/lib/explorer-model';

interface UseExplorerQueriesOptions {
  mode: ExplorerMode;
  includeArchived: boolean;
  /** Only the label grouping needs the label list. */
  groupByLabel: boolean;
}

/**
 * The two reads the explorer PANEL owns, plus the label list.
 *
 * Only these two decide a view's loading, error and empty states, and only the
 * panel can judge them — the flat and grouped views each own their query, so
 * they own their three states too. Both are disabled outside the view they
 * feed, which leaves them permanently `isPending`; that is why the panel's
 * gates are `&&`-ed with the current mode rather than read directly.
 *
 * Extracted from the panel so that file is composition rather than composition
 * plus four query declarations.
 */
export function useExplorerQueries({
  mode,
  includeArchived,
  groupByLabel,
}: UseExplorerQueriesOptions) {
  const queryClient = useQueryClient();
  const isTreeView = mode === 'tree';

  /**
   * The trash: archived notes, newest first, one page at a time.
   *
   * FLAT, and that is the shape the data forces. Archiving cascades DOWN a
   * subtree, so archiving a note that lived inside a live folder leaves an
   * archived row whose parent is NOT archived — it belongs to no level of
   * anything. Rebuilding the hierarchy would mean fetching every archived row
   * just to find the parents, which is the whole-corpus read the explorer
   * exists to avoid.
   */
  const archivedList = useInfiniteQuery({
    queryKey: noteKeys.archived(),
    queryFn: async ({ pageParam }) => {
      const res = await getArchivedNotes({ cursor: pageParam });
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: includeArchived,
  });

  const archivedRows = useMemo(
    () => archivedList.data?.pages.flatMap((page) => page.rows) ?? [],
    [archivedList.data]
  );

  /**
   * The ROOT level of the live tree — `parentId: null`, one page at a time.
   * Each folder fetches its own level when it expands; see `NoteTreeItem`.
   */
  const rootLevel = useInfiniteQuery({
    queryKey: noteKeys.children(null, includeArchived),
    queryFn: async ({ pageParam }) => {
      const res = await getNoteChildren({
        parentId: null,
        includeArchived,
        cursor: pageParam,
      });
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: isTreeView && !includeArchived,
  });

  const rootRows = useMemo(
    () => rootLevel.data?.pages.flatMap((page) => page.rows) ?? [],
    [rootLevel.data]
  );

  /** Label names for the grouped-by-label view; only fetched when shown. */
  const { data: labels } = useQuery({
    queryKey: noteKeys.labels(),
    queryFn: async () => {
      const res = await getNoteLabels();
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    enabled: mode === 'grouped' && groupByLabel,
  });

  /**
   * Every note row the per-level caches currently hold, deduplicated by id.
   *
   * A CALLBACK, not a memo, and `ExplorerDnd` calls it when a drop lands. The
   * levels settle inside `NoteTreeItem`, a child the panel does not re-render
   * for, so a value computed eagerly would be missing exactly the folder the
   * author just expanded — and a drop onto one of its rows would find no target
   * and quietly do nothing. `getQueriesData` prefix-matches, so one call covers
   * every level of both the live and the archived tree.
   */
  const loadedRows = useCallback((): NoteTreeNode[] => {
    const entries = queryClient.getQueriesData<
      InfiniteData<NotePage<NoteTreeNode>>
    >({ queryKey: noteKeys.childrenAll() });

    // A row can sit in two levels at once — `children(id, false)` and
    // `children(id, true)` are separate cache entries over overlapping sets.
    const byId = new Map<string, NoteTreeNode>();
    for (const [, data] of entries) {
      for (const page of data?.pages ?? []) {
        for (const row of page.rows) byId.set(row.id, row);
      }
    }
    return [...byId.values()];
  }, [queryClient]);

  // Whichever query actually feeds what is on screen decides that view's
  // states. Reading a query nothing on screen came from would let, say, a trash
  // failure blank a perfectly good tree.
  const source = includeArchived ? archivedList : rootLevel;

  return {
    archivedList,
    archivedRows,
    rootLevel,
    rootRows,
    labels: labels ?? [],
    loadedRows,
    /** True only in a view these two queries actually feed. */
    isPending: isTreeView && source.isPending,
    isLoadingError: isTreeView && source.isLoadingError,
    visibleRows: includeArchived ? archivedRows : rootRows,
  };
}
