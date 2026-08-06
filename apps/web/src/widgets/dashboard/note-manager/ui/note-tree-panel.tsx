'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from '@byte-of-me/ui';
import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Archive, ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  getArchivedNotes,
  getNoteChildren,
  getNoteLabels,
  NoteEmpty,
  noteKeys,
  type NotePage,
  type NoteTreeNode,
  NoteTreeSkeleton,
} from '@/entities/note';
import {
  useCreateNote,
  useNoteMutations,
  useRenameNote,
} from '@/features/dashboard/note-actions';
import {
  ExplorerDnd,
  ExplorerHeader,
  GroupedRowDndShell,
  GroupSectionDndShell,
  NoteFlatList,
  NoteGroupedList,
  NoteTrashList,
  NoteTreeList,
  RevealActiveNote,
  useExplorerPrefs,
  useExplorerTree,
  useTreeKeyboard,
  useVisibleTreeRows,
} from '@/features/dashboard/note-explorer';

interface NoteTreePanelProps {
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenSearch: () => void;
  /** Shows archived notes instead of live ones — the "trash" view. */
  includeArchived?: boolean;
  onToggleArchived?: () => void;
  /** Space navigation, mounted in this header on phones. */
  navSlot?: React.ReactNode;
  /**
   * Per-row actions menu, supplied by the widget so the entity layer below
   * never has to import a feature.
   *
   * `startRename` is handed BACK to the widget because the menu's "Rename"
   * item begins an in-place edit in this tree rather than opening a dialog —
   * the state it needs lives here, and the widget is the only thing allowed to
   * build the menu.
   */
  renderActions?: (
    node: NoteTreeNode,
    startRename: (noteId: string) => void
  ) => React.ReactNode;
  /** The same menu again, as a right-click wrapper. Same layering reason. */
  renderContextMenu?: (
    node: NoteTreeNode,
    row: React.ReactNode,
    startRename: (noteId: string) => void
  ) => React.ReactNode;
  /**
   * A folder to open the tree onto — what the editor's breadcrumb asks for
   * when a crumb is clicked. Distinct from `activeId`, which is a note and
   * arrives from the URL.
   */
  revealFolderId?: string | null;
}

/**
 * The explorer pane: header, one of four views, and the trash toggle.
 *
 * Composition only. The tree's interaction state lives in `useExplorerTree`,
 * its keyboard model in `useTreeKeyboard`, and each view renders itself — this
 * file decides which of them is on screen and owns the two queries whose
 * loading, error and empty states it is the only thing able to judge.
 */
export function NoteTreePanel({
  activeId,
  onSelect,
  onOpenSearch,
  includeArchived = false,
  onToggleArchived,
  navSlot,
  renderActions,
  renderContextMenu,
  revealFolderId,
}: NoteTreePanelProps) {
  const t = useTranslations('dashboard.note');
  const queryClient = useQueryClient();
  const { prefs, update: updatePrefs } = useExplorerPrefs();
  // The archived "trash" view stays a plain list: pin order and grouping are
  // live-notes concepts, and the mode menu is hidden there.
  const mode = includeArchived ? 'tree' : prefs.mode;
  const isTreeView = mode === 'tree';

  /** The trash: archived notes, newest first, one page at a time. */
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
  // loading, error and empty states. Reading a query nothing on screen came
  // from would let, say, a trash failure blank a perfectly good tree.
  //
  // Only the TREE and the TRASH are decided here. The flat and grouped views
  // each own their query, so they own their three states too — the panel
  // cannot see their rows to judge, and both queries here are disabled (hence
  // permanently `isPending`) in those modes, which would otherwise pin a
  // skeleton on screen.
  const source = includeArchived ? archivedList : rootLevel;
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

  // Destructured to their `mutate` functions, which TanStack keeps stable —
  // that is what lets the callbacks below have honest dependency arrays.
  const { mutate: renameNote } = useRenameNote();
  const { archive } = useNoteMutations();

  /**
   * The create mutation, reached through a ref.
   *
   * `useExplorerTree` needs a way to write a committed draft, and the mutation
   * needs `explorer.select` to make the new row the selection — each wants the
   * other first. A ref breaks the knot without either hook learning the other's
   * internals. `mutate` is referentially stable in TanStack v5, so this settles
   * once rather than on every render.
   */
  const createRef = useRef<
    (input: {
      parentId: string | null;
      isFolder: boolean;
      title: string;
    }) => void
  >(() => {});

  const explorer = useExplorerTree({
    onCreate: useCallback(
      (input: { parentId: string | null; isFolder: boolean; title: string }) =>
        createRef.current(input),
      []
    ),
    onRename: renameNote,
  });

  // Shared with the command palette's "New note" action — the invalidation
  // rationale (both trees + searchAll, never `noteKeys.all`) lives on the
  // hook itself in `features/dashboard/note-actions`.
  const create = useCreateNote(
    onSelect,
    // Folders included, which `onSelect` deliberately excludes: a new folder
    // has nothing to open but should still become the selection, so pressing
    // `n` again puts the next note inside it.
    (note) => explorer.select(note.id)
  );

  useEffect(() => {
    createRef.current = create.mutate;
  }, [create.mutate]);

  const treeRows = useVisibleTreeRows(
    rootRows,
    explorer.expandedIds,
    includeArchived
  );

  const { selectedNode, onKeyDown } = useTreeKeyboard({
    rows: treeRows,
    explorer,
    includeArchived,
    onOpenNote: onSelect,
    onArchive: archive.mutate,
  });

  // The two slots, bound to this tree's rename. The lists below keep the
  // simpler signatures; the extra argument stops here.
  const renderRowActions = useCallback(
    (node: NoteTreeNode) => renderActions?.(node, explorer.startRename),
    [renderActions, explorer.startRename]
  );

  // `?? row` is load-bearing: this wrapper is ALWAYS passed down, so when the
  // widget supplies no menu the optional call returns `undefined` — and a
  // wrapper that returns undefined does not render an unwrapped row, it renders
  // nothing at all. Every row in the tree vanished until this fallback existed.
  const renderRowContextMenu = useCallback(
    (node: NoteTreeNode, row: React.ReactNode) =>
      renderContextMenu?.(node, row, explorer.startRename) ?? row,
    [renderContextMenu, explorer.startRename]
  );

  /** True when the note the editor is showing is nowhere on screen. */
  const needsReveal =
    isTreeView &&
    !includeArchived &&
    activeId !== null &&
    !treeRows.some((row) => row.node.id === activeId);

  return (
    <div className="flex h-full flex-col">
      <ExplorerHeader
        prefs={prefs}
        onPrefsChange={updatePrefs}
        includeArchived={includeArchived}
        onOpenSearch={onOpenSearch}
        onStartDraft={(isFolder) => explorer.startDraft(isFolder, selectedNode)}
        navSlot={navSlot}
      />

      {/* The key handler sits on the SCROLLER, not on each row: rows focus
          themselves through a roving tabindex and their keydowns bubble here,
          so nothing has to register itself and the handler sees the whole
          tree. */}
      <div className="min-h-0 flex-1 overflow-y-auto p-1" onKeyDown={onKeyDown}>
        {needsReveal && activeId && (
          <RevealActiveNote noteId={activeId} onReveal={explorer.reveal} />
        )}

        {/* The same lookup for a folder the breadcrumb pointed at. `key` is
            what makes clicking a DIFFERENT crumb re-run it: the component is
            otherwise identical and React would keep the resolved instance. The
            target folder joins its own ancestor list here, because revealing a
            folder means opening it, not just scrolling to it. */}
        {revealFolderId && (
          <RevealActiveNote
            key={revealFolderId}
            noteId={revealFolderId}
            onReveal={(id, ancestorIds) =>
              explorer.reveal(id, [...ancestorIds, id])
            }
          />
        )}

        {isPending && <NoteTreeSkeleton />}

        {/* `isLoadingError`, not `isError`: TanStack v5 distinguishes a failure
            on the query's FIRST attempt (no data has ever arrived) from one on
            a BACKGROUND refetch, where the previous rows are left in place. A
            create invalidates this exact query, so one transient refetch
            failure must not replace a perfectly good tree — nor a legitimately
            EMPTY one, whose zero rows a count-based gate cannot tell apart from
            a first-load failure. */}
        {isLoadingError && (
          <p className="p-4 text-sm text-destructive">{t('errors.load')}</p>
        )}

        {/* `isTreeView` keeps this from stacking a second empty state on top of
            the flat/grouped views, which render their own. */}
        {isTreeView &&
          !isPending &&
          !isLoadingError &&
          visibleRows.length === 0 &&
          // The archived view gets its own copy: `NoteEmpty` invites the author
          // to write their first note, which is the wrong offer when what they
          // are looking at is an empty wastebasket.
          (includeArchived ? (
            <p className="p-4 text-sm text-muted-foreground">
              {t('archive.empty')}
            </p>
          ) : (
            <NoteEmpty onCreate={() => explorer.startDraft(false, null)} />
          ))}

        {includeArchived && (
          <NoteTrashList
            rows={archivedRows}
            activeId={activeId}
            onSelect={onSelect}
            hasNextPage={archivedList.hasNextPage}
            isFetching={archivedList.isFetching}
            onLoadMore={() => void archivedList.fetchNextPage()}
            renderActions={renderRowActions}
          />
        )}

        {/* One DndContext across every LIVE view. */}
        {!includeArchived && (
          <ExplorerDnd
            loadedRows={loadedRows}
            labels={labels ?? []}
            showRootZone={isTreeView}
          >
            {isTreeView && (
              <NoteTreeList
                rootRows={rootRows}
                activeId={activeId}
                explorer={explorer}
                onSelect={onSelect}
                hasNextPage={rootLevel.hasNextPage}
                isFetching={rootLevel.isFetching}
                onLoadMore={() => void rootLevel.fetchNextPage()}
                renderActions={renderRowActions}
                renderContextMenu={renderRowContextMenu}
              />
            )}

            {/* No row-count gate on either view: each owns its query, so each
                knows on its own whether it is loading, failed or genuinely
                empty. */}
            {mode === 'flat' && (
              <NoteFlatList
                sort={prefs.sort}
                includeArchived={false}
                activeId={activeId}
                onSelect={onSelect}
                onCreate={() => explorer.startDraft(false, null)}
                renderActions={renderRowActions}
              />
            )}

            {mode === 'grouped' && (
              <NoteGroupedList
                groupBy={prefs.groupBy}
                includeArchived={false}
                activeId={activeId}
                onSelect={onSelect}
                onCreate={() => explorer.startDraft(false, null)}
                renderActions={renderRowActions}
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
        )}
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
