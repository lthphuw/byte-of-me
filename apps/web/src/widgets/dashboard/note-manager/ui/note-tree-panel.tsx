'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@byte-of-me/ui';
import { useMutationState } from '@tanstack/react-query';
import { Archive, ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  NoteEmpty,
  type NoteTreeNode,
  NoteTreeSkeleton,
} from '@/entities/note';
import {
  ArchiveNoteDialog,
  CREATE_NOTE_MUTATION_KEY,
  createTargetParentId,
  useCreateNote,
  useNoteMutations,
  useRenameNote,
} from '@/features/dashboard/note-actions';
import {
  ExplorerBlankMenu,
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
  useExplorerQueries,
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
  /**
   * Fired once the tree has opened onto `revealFolderId`, so the widget can
   * retire the request. Without it the request stands forever and re-imposes
   * itself on every render — see the prop's own comment in `note-manager.tsx`.
   */
  onFolderRevealed?: () => void;
  /**
   * The note that just left the tree — archived from HERE, by
   * Delete/Backspace. The widget decides whether that means closing the editor
   * (it was the open note) or nothing at all.
   */
  onRemoved?: (noteId: string) => void;
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
  onFolderRevealed,
  onRemoved,
}: NoteTreePanelProps) {
  const t = useTranslations('dashboard.note');
  const { prefs, update: updatePrefs } = useExplorerPrefs();
  // The archived "trash" view stays a plain list: pin order and grouping are
  // live-notes concepts, and the mode menu is hidden there.
  const mode = includeArchived ? 'tree' : prefs.mode;
  const isTreeView = mode === 'tree';

  const {
    archivedList,
    archivedRows,
    rootLevel,
    rootRows,
    labels,
    loadedRows,
    isPending,
    isLoadingError,
    visibleRows,
  } = useExplorerQueries({
    mode,
    includeArchived,
    groupByLabel: prefs.groupBy === 'label',
  });

  // Destructured to their `mutate` functions, which TanStack keeps stable —
  // that is what lets the callbacks below have honest dependency arrays.
  const { mutate: renameNote } = useRenameNote();
  // `onRemoved` matters here even though this panel only reaches `archive`:
  // the row menus get the same callback through `renderActions`, and the two
  // paths archiving the SAME note must end the same way.
  const { archive } = useNoteMutations({ onRemoved });

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

  /**
   * Which levels have a create in flight — `null` is the root.
   *
   * From the MUTATION CACHE, not from `create` above: the row menu's "New note
   * inside" runs its own instance inside `useNoteActionItems`, which Radix
   * unmounts the moment the item is chosen — taking its `isPending` with it.
   * The cache outlives the observer, so one subscription covers both paths.
   *
   * A pending ROW rather than an optimistic insert: an optimistic row would
   * have to invent a `NoteTreeNode` and then sit in the level's cache among
   * real rows a background refetch reorders, which is the "never replace
   * loaded rows" line this file and `NoteFlatList` draw. A skeleton appended
   * where `createNote` puts the row (`position = last + 1`) only adds.
   *
   * `useMutationState` runs its result through `replaceEqualDeep`, so this
   * array's identity changes only when the set of pending creates does.
   */
  const pendingParents = useMutationState({
    filters: { mutationKey: CREATE_NOTE_MUTATION_KEY, status: 'pending' },
    select: (mutation) => createTargetParentId(mutation.state.variables),
  });
  const pendingParentIds = useMemo(
    // `undefined` is "these variables name no level I recognise" — see
    // `createTargetParentId`. Dropped rather than turned into a level, because
    // every value that survives here draws a skeleton row somewhere, and a row
    // in the wrong place is worse than no row at all.
    () =>
      new Set(
        pendingParents.filter(
          (parentId): parentId is string | null => parentId !== undefined
        )
      ),
    [pendingParents]
  );

  const treeRows = useVisibleTreeRows(
    rootRows,
    explorer.expandedIds,
    includeArchived
  );

  /**
   * The row Delete/Backspace has asked to archive, held until confirmed.
   *
   * The keystroke used to call `archive.mutate` straight through. That was
   * defended as acceptable because archiving is reversible — but reversible is
   * not the same as small: the mutation cascades, so one unconfirmed keypress
   * on a folder took the folder and every note under it. It did exactly that
   * to a nine-note subtree, and the author's only clue was a toast.
   */
  const [archiveTarget, setArchiveTarget] = useState<NoteTreeNode | null>(null);

  const { selectedNode, onKeyDown } = useTreeKeyboard({
    rows: treeRows,
    explorer,
    includeArchived,
    onOpenNote: onSelect,
    onArchive: (noteId) =>
      setArchiveTarget(
        treeRows.find((row) => row.node.id === noteId)?.node ?? null
      ),
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

  /**
   * The note a reveal is still owed for — a REQUEST, not a standing condition,
   * and that distinction is the entire fix for the folder that would not stay
   * shut.
   *
   * This used to be recomputed every render as "is the open note among the
   * visible rows", which is exactly what collapsing the folder the open note
   * lives in makes false. `RevealActiveNote` then mounted with its ancestor
   * query already cached, fired on its first commit, and re-expanded
   * everything — measured in the browser with a MutationObserver on
   * `aria-expanded`: collapsed, then back open 107ms later, with the selection
   * yanked off the folder the author had just clicked onto the note.
   *
   * A reveal is owed when THE OPEN NOTE CHANGES — a reload onto a note buried
   * in collapsed folders, the command palette, a `[[` link, Back/Forward — and
   * it is settled either by the reveal landing or by the row turning out to be
   * on screen already. Collapsing a folder is neither, so it now asks for
   * nothing.
   *
   * Adjusted during render rather than in an effect, the same
   * "state derived from a prop" pattern `note-manager.tsx` uses for
   * `openNoteId`: an effect would leave one commit in which the request still
   * looks outstanding, which is one commit in which the tree would re-expand.
   */
  const [revealTarget, setRevealTarget] = useState<string | null>(activeId);
  const lastActiveId = useRef(activeId);

  // ONE write, and it compares against the value it is replacing. Both
  // adjustments used to call `setRevealTarget` on their own: a new request
  // when `activeId` moved, then a clear when the target turned up among the
  // visible rows. The second read `revealTarget` — the value from BEFORE the
  // first one had been applied — so a render in which both fire cleared the
  // request that had just been made, and the note the author had switched to
  // was never revealed. Both DO fire together: the row becoming visible and
  // the route moving are two async updates React is free to batch into one
  // render, which is exactly what happens when a reveal lands at the same
  // moment as the next `router.push`.
  //
  // Deriving this instead of storing it is not an option, and neither is an
  // effect. Once settled it must STAY settled however the tree changes
  // afterwards — recomputing "is the open note visible" is what re-expanded a
  // folder the author had just collapsed — and an effect would leave one
  // commit in which the request still looks outstanding, which is one commit
  // in which `RevealActiveNote` mounts and re-expands it.
  let nextRevealTarget = revealTarget;
  if (lastActiveId.current !== activeId) {
    lastActiveId.current = activeId;
    nextRevealTarget = activeId;
  }
  if (
    nextRevealTarget !== null &&
    treeRows.some((row) => row.node.id === nextRevealTarget)
  ) {
    nextRevealTarget = null;
  }
  if (nextRevealTarget !== revealTarget) setRevealTarget(nextRevealTarget);

  /** True when the note the editor is showing is nowhere on screen AND the
   *  tree has not already been opened onto it once. Read off the value this
   *  render settled on rather than the state it replaces — the two differ for
   *  exactly the render that settles them, and that render is the one whose
   *  answer matters. */
  const needsReveal =
    isTreeView && !includeArchived && nextRevealTarget !== null;

  // Clears the request as it satisfies it, so a refetch of the ancestor chain
  // — which every save invalidates, via `noteKeys.lists()` — cannot re-fire
  // this against a tree the author has since collapsed by hand.
  //
  // `reveal` is destructured rather than called as `explorer.reveal` for the
  // reason `use-note-editor-autosave.ts` destructures `mutate`: a member CALL
  // makes `react-hooks/exhaustive-deps` ask for the whole object, and
  // depending on `explorer` would re-arm this on every selection change. This
  // form is both honest and machine-checkable.
  const { reveal } = explorer;
  const onRevealActive = useCallback(
    (id: string, ancestorIds: readonly string[]) => {
      setRevealTarget(null);
      reveal(id, ancestorIds);
    },
    [reveal]
  );

  /**
   * The same, for the folder a breadcrumb crumb pointed at. The target folder
   * joins its own ancestor list, because revealing a folder means opening it,
   * not just scrolling to it.
   *
   * `useCallback`, not an inline arrow, and that is the fix rather than a
   * tidy-up: `RevealActiveNote` lists `onReveal` in its effect's dependency
   * array, so a fresh identity every render re-ran the effect every render.
   * Paired with a `revealFolderId` that was never cleared, one breadcrumb
   * click armed a permanent `explorer.reveal` — and that closes an actual
   * render loop, not just a selection that drifts. `NoteTreeItem` calls
   * `explorer.clearReveal()` once it has scrolled the revealed row into view
   * (see its effect on `revealId`); clearing changes `explorer`'s identity,
   * which re-renders this panel, which hands `RevealActiveNote` a new
   * `onReveal`, which re-fires the effect, which sets `revealId` again.
   * Measured: `note-tree-panel.spec.tsx`'s breadcrumb-reveal test run against
   * the pre-fix file aborts with React's "Maximum update depth exceeded" and
   * hangs the suite.
   *
   * Retiring the request (`onFolderRevealed`) is the other half. Either alone
   * still leaves a reveal that can re-fire against a tree the author has
   * since changed by hand — the same distinction `revealTarget` above draws
   * between a request and a standing condition.
   */
  const onRevealFolder = useCallback(
    (id: string, ancestorIds: readonly string[]) => {
      onFolderRevealed?.();
      reveal(id, [...ancestorIds, id]);
    },
    [onFolderRevealed, reveal]
  );

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
      <div className="min-h-0 flex-1 overflow-y-auto" onKeyDown={onKeyDown}>
        {/* The padding moved from the scroller onto the surface below, so the
            gutter is part of the right-clickable background rather than a
            dead 4px frame around it. */}
        <ExplorerBlankMenu
          disabled={includeArchived}
          onStartDraft={(isFolder) => explorer.startDraft(isFolder, null)}
          onClickBlank={explorer.deselect}
        >
          {needsReveal && nextRevealTarget && (
            <RevealActiveNote
              noteId={nextRevealTarget}
              onReveal={onRevealActive}
            />
          )}

          {/* The same lookup for a folder the breadcrumb pointed at.
            `onRevealFolder` retires the request as it satisfies it, so this
            unmounts on its own the moment the tree opens — which is also what
            makes clicking the SAME crumb twice work, with no `key` needed:
            the request goes back to `null` in between, so the second click is
            a genuine mount rather than a re-render of a resolved instance. */}
          {revealFolderId && (
            <RevealActiveNote
              noteId={revealFolderId}
              onReveal={onRevealFolder}
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
            // A first note being written right now is not an empty tree: the
            // pending row is already on screen, and inviting the author to
            // create one underneath it would be answering a question they
            // have just answered.
            !pendingParentIds.has(null) &&
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
              labels={labels}
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
                  pendingParentIds={pendingParentIds}
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
        </ExplorerBlankMenu>
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

      {/* The dialog no longer dismisses itself (it `preventDefault`s the
          Radix close), so closing it is this panel's job — and the moment
          matters. Closing on the CLICK put the confirmation off screen before
          the subtree-wide archive had been dispatched, which made both the
          `isPending` spinner and the failure case invisible: a cascading
          archive that errored left the author looking at a tree that had not
          changed, with only a toast to say why.

          `onSuccess` ONLY, so a failure leaves the dialog up with its buttons
          live — the same rule `DeleteNoteDialog` follows, and the reason a
          destructive action must never silently not happen.

          The per-call form is safe here specifically because this panel owns
          the observer and stays mounted for the whole flight (it is the
          always-rendered explorer aside): `MutationObserver` drops per-call
          callbacks only when `hasListeners()` is false, which is what makes
          the same form wrong inside the row menus, where Radix unmounts the
          observer as the menu closes. */}
      <ArchiveNoteDialog
        node={archiveTarget}
        isPending={archive.isPending}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
        onConfirm={(noteId) => {
          archive.mutate(noteId, { onSuccess: () => setArchiveTarget(null) });
        }}
      />
    </div>
  );
}
