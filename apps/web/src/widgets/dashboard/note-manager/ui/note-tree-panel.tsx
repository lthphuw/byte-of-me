'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
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
  getNoteAncestors,
  getNoteChildren,
  getNoteLabels,
  NoteEmpty,
  noteKeys,
  type NotePage,
  NoteRowInput,
  NoteTreeItem,
  type NoteTreeNode,
  NoteTreeSkeleton,
} from '@/entities/note';
import {
  useCreateNote,
  useNoteMutations,
  useRenameNote,
} from '@/features/dashboard/note-actions';
import {
  type ArrowKey,
  ExplorerDnd,
  ExplorerRow,
  ExplorerViewMenu,
  flattenVisibleRows,
  GroupedRowDndShell,
  GroupSectionDndShell,
  navigate,
  NoteFlatList,
  NoteGroupedList,
  TreeRowDndShell,
  useExplorerPrefs,
  useExplorerTree,
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
  /**
   * Per-row actions menu, supplied by the widget so the entity layer below
   * never has to import a feature.
   *
   * `startRename` is handed BACK to the widget because the menu's "Rename"
   * item now begins an in-place edit in this tree rather than opening a
   * dialog — the state it needs lives here, and the widget is the only thing
   * allowed to build the menu.
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

  const rename = useRenameNote();
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
    onCreate: (input) => createRef.current(input),
    onRename: (input) => rename.mutate(input),
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

  /**
   * Every row the tree is drawing, in screen order — what the arrow keys walk.
   *
   * Read straight out of the per-level caches rather than tracked separately:
   * the levels settle inside `NoteTreeItem`, a child this panel does not
   * re-render for, so a list kept here would go stale the moment a folder
   * expanded. Same reasoning, and the same cache, as `loadedRows` above.
   */
  const keyboardRows = useMemo(
    () =>
      flattenVisibleRows(rootRows, explorer.expandedIds, (parentId) => {
        const level = queryClient.getQueryData<
          InfiniteData<NotePage<NoteTreeNode>>
        >(noteKeys.children(parentId, includeArchived));
        return level?.pages.flatMap((page) => page.rows);
      }),
    [rootRows, explorer.expandedIds, queryClient, includeArchived]
  );

  const selectedNode =
    keyboardRows.find((row) => row.node.id === explorer.selectedId)?.node ??
    null;

  // The two slots, bound to this tree's rename. `NoteTreeItem` keeps the
  // simpler two-argument signatures it already had; the extra argument stops
  // here.
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

  /**
   * True when the note the editor is showing is nowhere on screen.
   *
   * That is the ordinary case for anything opened from outside the tree — the
   * command palette, a `[[` link, or a reload straight onto a note buried in
   * folders that all start collapsed. Before this, the explorer simply said
   * nothing about where the open note lived.
   */
  const needsReveal =
    isTreeView &&
    !includeArchived &&
    activeId !== null &&
    !keyboardRows.some((row) => row.node.id === activeId);

  /**
   * The tree's keyboard model, bound on the scroll container so it sees every
   * row's bubbled event without any row having to register itself.
   *
   * `Cmd+N` is NOT among these bindings and cannot be: browsers consume it
   * before a page ever sees a `keydown`, so `preventDefault` has nothing to
   * prevent. VSCode can bind it because it is not in a browser. The bare keys
   * below are the web equivalent, and they are safe precisely because they only
   * apply while focus is inside the tree — the draft and rename inputs stop
   * their own keystrokes from reaching here (see `NoteRowInput`).
   */
  const onTreeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const key = event.key;

    if (
      key === 'ArrowUp' ||
      key === 'ArrowDown' ||
      key === 'ArrowLeft' ||
      key === 'ArrowRight'
    ) {
      const intent = navigate(
        key as ArrowKey,
        keyboardRows,
        explorer.selectedId,
        explorer.expandedIds
      );
      // Only swallow the key when it actually did something, so a tree that
      // cannot move left still lets the page scroll.
      if (Object.keys(intent).length === 0) return;
      event.preventDefault();
      if (intent.selectId) explorer.select(intent.selectId);
      if (intent.expandId) explorer.expand(intent.expandId);
      if (intent.collapseId) explorer.collapse(intent.collapseId);
      return;
    }

    if (key === 'Enter') {
      if (!selectedNode) return;
      event.preventDefault();
      if (selectedNode.isFolder) {
        explorer.toggle(selectedNode.id);
      } else {
        onSelect(selectedNode.id);
      }
      return;
    }

    // `n` / `Shift+N`, the browser-safe stand-ins for Cmd+N / Cmd+Shift+N.
    if (key === 'n' || key === 'N') {
      if (includeArchived) return;
      event.preventDefault();
      explorer.startDraft(event.shiftKey, selectedNode);
      return;
    }

    if (key === 'F2') {
      if (!selectedNode) return;
      event.preventDefault();
      explorer.startRename(selectedNode.id);
      return;
    }

    if (key === 'Delete' || key === 'Backspace') {
      if (!selectedNode || includeArchived) return;
      event.preventDefault();
      archive.mutate(selectedNode.id);
    }
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

        {/* Both buttons open a DRAFT ROW now rather than writing an
            "Untitled" note straight away, and both aim at the explorer's
            selection rather than unconditionally at the root — the two things
            that made every new note start with a rename and a drag. */}
        {!includeArchived && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.newFolder')}
            onClick={() => explorer.startDraft(true, selectedNode)}
          >
            <FolderPlus className="size-4" />
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('actions.create')}
          onClick={() => explorer.startDraft(false, selectedNode)}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {/* The key handler sits on the SCROLLER, not on each row: rows focus
          themselves through a roving tabindex and their keydowns bubble here,
          so nothing has to register itself and the handler sees the whole tree.
          Bindings are scoped to this subtree by construction — outside it, no
          row has focus, so nothing fires. */}
      <div
        className="min-h-0 flex-1 overflow-y-auto p-1"
        onKeyDown={onTreeKeyDown}
      >
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
            <NoteEmpty onCreate={() => explorer.startDraft(false, null)} />
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
                  actions={renderRowActions(node)}
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
          {/* The row-count gate now also lets a ROOT-LEVEL draft through: an
              author with no notes at all still has to be able to type the name
              of their first one, and the empty state above hands off to exactly
              that. */}
          {!includeArchived &&
            mode === 'tree' &&
            (rootRows.length > 0 || explorer.draft?.parentId === null) && (
              <ul role="tree" aria-label={t('tree.treeAriaLabel')}>
                {rootRows.map((node) => (
                  <NoteTreeItem
                    key={node.id}
                    node={node}
                    activeId={activeId}
                    explorer={explorer}
                    onSelect={onSelect}
                    renderActions={renderRowActions}
                    renderContextMenu={renderRowContextMenu}
                    renderRowShell={(rowNode, row) => (
                      <TreeRowDndShell node={rowNode}>{row}</TreeRowDndShell>
                    )}
                  />
                ))}

                {/* The root level's draft. Deeper levels render their own
                    inside `NoteTreeItem`, next to the children they belong
                    among. */}
                {explorer.draft?.parentId === null && (
                  <li>
                    <NoteRowInput
                      depth={0}
                      isFolder={explorer.draft.isFolder}
                      label={
                        explorer.draft.isFolder
                          ? t('tree.draftFolderLabel')
                          : t('tree.draftNoteLabel')
                      }
                      onSubmit={explorer.submitDraft}
                      onCancel={explorer.cancelDraft}
                    />
                  </li>
                )}

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
              renderActions={renderRowActions}
            />
          )}

          {mode === 'grouped' && (
            <NoteGroupedList
              groupBy={prefs.groupBy}
              includeArchived={includeArchived}
              activeId={activeId}
              onSelect={onSelect}
              onCreate={() => create.mutate({})}
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

/**
 * Opens the tree onto the note the editor is showing.
 *
 * A separate component purely so `noteId` is non-null here — the same shape,
 * and for the same reason, as `OpenNoteActions` in `note-manager.tsx`. The
 * alternative is a placeholder key plus `enabled`, which parks a cache entry
 * under an id that does not exist.
 *
 * It renders nothing. The one thing it does is turn an ancestor chain into
 * expanded folders and a selection; the row itself handles scrolling, on mount,
 * when it sees its own id in `revealId` — see `NoteExplorerControls`.
 *
 * It unmounts as soon as the row becomes visible, because the condition that
 * mounts it (`needsReveal`) stops holding. That is also what stops this from
 * looping: `data` keeps its identity across the renders while the newly
 * expanded levels load, so the effect below does not re-fire.
 */
function RevealActiveNote({
  noteId,
  onReveal,
}: {
  noteId: string;
  onReveal: (id: string, ancestorIds: readonly string[]) => void;
}) {
  const { data } = useQuery({
    queryKey: noteKeys.ancestors(noteId),
    queryFn: async () => {
      const res = await getNoteAncestors(noteId);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
  });

  useEffect(() => {
    if (!data) return;
    onReveal(
      noteId,
      data.map((ancestor) => ancestor.id)
    );
  }, [data, noteId, onReveal]);

  // A failed lookup is deliberately silent: the note is open and readable, the
  // tree just does not scroll to it. Interrupting the author with a toast about
  // a navigational nicety would be the louder bug.
  return null;
}
