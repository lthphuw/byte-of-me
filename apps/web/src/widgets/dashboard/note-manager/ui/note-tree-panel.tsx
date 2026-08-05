'use client';

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@byte-of-me/ui';
import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Archive, ArrowLeft, FolderPlus, Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  getArchivedNotes,
  getNoteChildren,
  getNoteLabels,
  NoteEmpty,
  noteKeys,
  type NotePage,
  NoteTreeItem,
  type NoteTreeNode,
  NoteTreeSkeleton,
} from '@/entities/note';
import { useCreateNote } from '@/features/dashboard/note-actions';
import {
  ExplorerDnd,
  ExplorerRow,
  ExplorerViewMenu,
  GroupedRowDndShell,
  GroupSectionDndShell,
  NoteFlatList,
  NoteGroupedList,
  TreeRowDndShell,
  useExplorerPrefs,
} from '@/features/dashboard/note-explorer';
import { InfiniteSentinel } from '@/shared/ui/infinite-sentinel';

interface NoteTreePanelProps {
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenSearch: () => void;
  /** Shows archived notes instead of live ones — the "trash" view. */
  includeArchived?: boolean;
  onToggleArchived?: () => void;
  /** Space navigation, mounted in this header on phones. */
  navSlot?: React.ReactNode;
  /** Per-row actions menu, supplied by the widget so the entity layer below
   *  never has to import a feature. */
  renderActions?: (node: NoteTreeNode) => React.ReactNode;
}

export function NoteTreePanel({
  activeId,
  onSelect,
  onOpenSearch,
  includeArchived = false,
  onToggleArchived,
  navSlot,
  renderActions,
}: NoteTreePanelProps) {
  const t = useTranslations('dashboard.note');
  const queryClient = useQueryClient();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const { prefs, update: updatePrefs } = useExplorerPrefs();
  // The archived "trash" view stays a plain tree: pin order and grouping are
  // live-notes concepts, and the mode menu is hidden there.
  const mode = includeArchived ? 'tree' : prefs.mode;

  /**
   * The trash: archived notes, newest first, one page at a time.
   *
   * FLAT, where it used to be a tree, and that is the shape the data forces.
   * Archiving cascades DOWN a subtree, so archiving a note that lived inside a
   * live folder leaves an archived row whose parent is NOT archived — it
   * belongs to no level of anything. The old view papered over that by
   * fetching the entire corpus and letting `buildNoteTree` surface such rows
   * at the root; rebuilding the hierarchy here would mean fetching every
   * archived row anyway just to find the parents, which is the read this whole
   * change removes. A wastebasket ordered by when things went into it is also
   * what the view is for.
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
   * Every note row the per-level caches currently hold, deduplicated by id.
   *
   * A CALLBACK, not a memo, and `ExplorerDnd` calls it when a drop lands. The
   * levels settle inside `NoteTreeItem`, a child this panel does not re-render
   * for, so a value computed here would be missing exactly the folder the
   * author just expanded — and a drop onto one of its rows would find no
   * target and quietly do nothing. `getQueriesData` prefix-matches, so one
   * call covers every level of both the live and the archived tree.
   */
  const loadedRows = useCallback((): NoteTreeNode[] => {
    const entries = queryClient.getQueriesData<
      InfiniteData<NotePage<NoteTreeNode>>
    >({ queryKey: noteKeys.childrenAll() });

    // A row can sit in two levels at once — `children(id, false)` and
    // `children(id, true)` are separate cache entries over overlapping sets —
    // and `collectDescendantIds` would then count it twice.
    const byId = new Map<string, NoteTreeNode>();
    for (const [, data] of entries) {
      for (const page of data?.pages ?? []) {
        for (const row of page.rows) byId.set(row.id, row);
      }
    }
    return [...byId.values()];
  }, [queryClient]);

  /**
   * The ROOT level of the live tree — `parentId: null`, one page at a time.
   * Each folder fetches its own level when it expands; see `NoteTreeItem`.
   */
  const isLevelTree = mode === 'tree' && !includeArchived;
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
    enabled: isLevelTree,
  });

  const rootRows = useMemo(
    () => rootLevel.data?.pages.flatMap((page) => page.rows) ?? [],
    [rootLevel.data]
  );

  // Whichever query actually feeds what is on screen decides that view's
  // loading, error and empty states. Reading a query nothing on screen came
  // from would let, say, a trash failure blank a perfectly good tree.
  //
  // Only the TREE and the TRASH are decided here. The flat and grouped views
  // each own their query, so they own their three states too — the panel
  // cannot see their rows to judge, and both queries here are disabled (hence
  // permanently `isPending`) in those modes, which would otherwise pin a
  // skeleton on screen.
  const source = includeArchived ? archivedList : rootLevel;
  const isTreeView = mode === 'tree';
  const isPending = isTreeView && source.isPending;
  const isLoadingError = isTreeView && source.isLoadingError;
  const visibleRows = includeArchived ? archivedRows : rootRows;

  // Label names for the grouped-by-label view; only fetched when shown.
  const { data: labels } = useQuery({
    queryKey: noteKeys.labels(),
    queryFn: async () => {
      const res = await getNoteLabels();
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    enabled: mode === 'grouped' && prefs.groupBy === 'label',
  });

  // Shared with the command palette's "New note" action — the invalidation
  // rationale (both trees + searchAll, never `noteKeys.all`) lives on the
  // hook itself in `features/dashboard/note-actions`.
  const create = useCreateNote(onSelect);

  const toggle = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b p-2">
        {navSlot}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-w-0 flex-1 justify-start gap-2 text-muted-foreground"
          onClick={onOpenSearch}
        >
          <Search className="size-3.5 shrink-0" />
          <span className="truncate">{t('search.trigger')}</span>
        </Button>

        {!includeArchived && (
          <ExplorerViewMenu
            mode={prefs.mode}
            sort={prefs.sort}
            groupBy={prefs.groupBy}
            onChange={updatePrefs}
          />
        )}

        {!includeArchived && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.newFolder')}
            disabled={create.isPending}
            onClick={() => create.mutate({ isFolder: true })}
          >
            <FolderPlus className="size-4" />
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('actions.create')}
          disabled={create.isPending}
          onClick={() => create.mutate({})}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        {/* `isPending` and `isLoadingError` are mutually exclusive branches
            of the same TanStack `status` enum, so neither gate below needs
            to reference the other — unlike the note editor's `isSeeded`,
            which is a second, independently-derived boolean and had to be
            ordered ahead of its error check for that reason (see
            note-editor.tsx's own long comment on it). `visibleRows.length
            === 0` in the line directly below is consequently a dead second
            conjunct — `isPending` already implies `data === undefined`,
            hence no rows — kept rather than removed; deleting it buys
            nothing and this comment is cheaper than a diff. */}
        {isPending && visibleRows.length === 0 && <NoteTreeSkeleton />}

        {/* `isLoadingError`, not `isError`/`length === 0`: TanStack
            Query v5 distinguishes a failure on the query's FIRST attempt
            (`isLoadingError` — no data has ever arrived) from a failure on
            a BACKGROUND refetch while data already sits in the cache
            (`isRefetchError` — the previous `data`, whatever it was, is
            left in place). The create mutation above invalidates this
            exact query on every note it creates, so a single transient
            refetch failure right after a create must not replace whatever
            is already on screen with the load-error message. An earlier
            version of this gate used `isError && tree.length === 0`, which
            protects a good, NON-EMPTY tree correctly but gets the other
            case wrong: a legitimately empty tree (no notes yet) also has
            zero rows, so a failed background refetch right after
            creating a first note would show "Could not load your notes."
            instead of the create-a-note empty state, at exactly the
            moment a first-time author needs it least. `isLoadingError`
            keys on whether a load ever actually SUCCEEDED — the real
            question — and gets both cases right. */}
        {isLoadingError && (
          <p className="p-4 text-sm text-destructive">{t('errors.load')}</p>
        )}

        {/* `isTreeView` is what keeps this from stacking a second empty state
            on top of the flat/grouped views, which render their own: outside
            the tree `isPending`/`isLoadingError` are both false by definition
            above and `visibleRows` is the disabled root level's zero rows. */}
        {isTreeView && !isPending && !isLoadingError && visibleRows.length === 0 && (
          // The archived view gets its own copy: `NoteEmpty` invites the
          // author to write their first note, which is the wrong offer when
          // what they are actually looking at is an empty wastebasket.
          includeArchived ? (
            <p className="p-4 text-sm text-muted-foreground">
              {t('archive.empty')}
            </p>
          ) : (
            <NoteEmpty onCreate={() => create.mutate({})} />
          )
        )}

        {/* The trash is a flat, newest-first list — see `archivedList`. Rows
            reuse the flat view's presentational row, and nothing here drags:
            reordering or re-parenting something already in the bin is not a
            move anyone means to make. */}
        {includeArchived && archivedRows.length > 0 && (
          <ul>
            {archivedRows.map((node) => (
              <li key={node.id}>
                <ExplorerRow
                  node={node}
                  isActive={node.id === activeId}
                  onSelect={onSelect}
                  actions={renderActions?.(node)}
                />
              </li>
            ))}
            <li>
              <InfiniteSentinel
                hasNextPage={archivedList.hasNextPage}
                isFetching={archivedList.isFetching}
                onLoadMore={() => void archivedList.fetchNextPage()}
              />
            </li>
          </ul>
        )}

        {/* One DndContext across every LIVE view. */}
        <ExplorerDnd
          loadedRows={loadedRows}
          labels={labels ?? []}
          showRootZone={mode === 'tree' && !includeArchived}
        >
          {!includeArchived && rootRows.length > 0 && mode === 'tree' && (
            <ul>
              {rootRows.map((node) => (
                <NoteTreeItem
                  key={node.id}
                  node={node}
                  activeId={activeId}
                  expandedIds={expandedIds}
                  onSelect={onSelect}
                  onToggle={toggle}
                  renderActions={renderActions}
                  renderRowShell={(rowNode, row) => (
                    <TreeRowDndShell node={rowNode}>{row}</TreeRowDndShell>
                  )}
                />
              ))}

              {/* Root level only: every deeper level carries its own sentinel
                  inside `NoteTreeItem`. */}
              {rootLevel.hasNextPage && (
                <li>
                  <InfiniteSentinel
                    hasNextPage={rootLevel.hasNextPage}
                    isFetching={rootLevel.isFetching}
                    onLoadMore={() => void rootLevel.fetchNextPage()}
                  />
                </li>
              )}
            </ul>
          )}

          {/* No row-count gate on either view any more: each owns its query,
              so each knows on its own whether it is loading, failed or
              genuinely empty — and the panel no longer holds the rows it
              would have counted. */}
          {mode === 'flat' && (
            <NoteFlatList
              sort={prefs.sort}
              includeArchived={includeArchived}
              activeId={activeId}
              onSelect={onSelect}
              onCreate={() => create.mutate({})}
              renderActions={renderActions}
            />
          )}

          {mode === 'grouped' && (
            <NoteGroupedList
              groupBy={prefs.groupBy}
              includeArchived={includeArchived}
              activeId={activeId}
              onSelect={onSelect}
              onCreate={() => create.mutate({})}
              renderActions={renderActions}
              renderSection={(group, section) => (
                <GroupSectionDndShell key={group.key} group={group}>
                  {section}
                </GroupSectionDndShell>
              )}
              renderRowShell={(group, node, row) => (
                <GroupedRowDndShell group={group} node={node}>
                  {row}
                </GroupedRowDndShell>
              )}
            />
          )}
        </ExplorerDnd>
      </div>

      {onToggleArchived && (
        <div className="border-t p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={onToggleArchived}
          >
            {includeArchived ? (
              <ArrowLeft className="size-3.5 shrink-0" />
            ) : (
              <Archive className="size-3.5 shrink-0" />
            )}
            <span className="truncate">
              {includeArchived
                ? t('actions.hideArchived')
                : t('actions.showArchived')}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
