'use client';

import { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { getNoteChildren } from '@/entities/note/api/get-note-children';
import { noteKeys } from '@/entities/note/model/query-keys';
import type {
  NoteExplorerControls,
  NoteTreeNode,
} from '@/entities/note/model/types';
import { useNotePrefetch } from '@/entities/note/model/use-note-prefetch';
import { NoteRow } from '@/entities/note/ui/note-row';
import { NoteRowInput } from '@/entities/note/ui/note-row-input';
import { noteRowIndent } from '@/entities/note/ui/note-row-shell';
import { NoteRowSkeleton } from '@/entities/note/ui/note-tree-skeleton';
import { InfiniteSentinel } from '@/shared/ui/infinite-sentinel';

/** Shared empty level, so a row with no children re-renders referentially stable. */
const NO_ROWS: NoteTreeNode[] = [];

// This IS a `role="tree"` widget now, and the obligations that come with the
// pattern are met rather than avoided. An earlier version of this file
// deliberately used no tree roles at all, on the grounds that a partial tree
// role is worse than none — assistive tech would announce arrow-key navigation
// and type-ahead that did not exist. The panel above now implements the
// keyboard model (see `explorer-model.ts`'s `navigate`, and the key handler in
// `note-tree-panel.tsx`), so the roles are correct to claim:
//
//   ul   role="tree" (root, in the panel) / role="group" (every nested level)
//   li   role="treeitem", carrying aria-level, aria-selected, aria-expanded
//
// Focus lives on the `li`, with a roving tabindex — exactly one row in the tree
// is tabbable at a time. The chevron and title buttons inside are `tabIndex={-1}`
// so Tab moves past the whole tree in one step instead of through every row.
//
// `aria-current` is kept alongside `aria-selected` because they answer different
// questions here: `aria-selected` is the explorer's cursor, `aria-current` is
// the note actually open in the editor. VSCode shows the same two states at
// once, and collapsing them would lose the distinction the whole selection
// model exists for.
interface NoteTreeItemProps {
  /**
   * A FLAT row. This component used to take a pre-nested
   * `NoteTreeNodeWithChildren` built from the whole corpus; it now fetches its
   * own level, so the caller only ever hands it one row.
   */
  node: NoteTreeNode;
  /** The note open in the editor, from the URL. NOT the explorer selection. */
  activeId: string | null;
  depth?: number;
  /** Passed straight through to this row's own `getNoteChildren` read. */
  includeArchived?: boolean;
  /**
   * Selection, expansion, the draft row and the in-place rename — one object
   * rather than eight props threaded through a component that recurses at every
   * depth. See `NoteExplorerControls` for why it is declared in this layer and
   * built in the explorer feature.
   */
  explorer: NoteExplorerControls;
  onSelect: (id: string) => void;
  /**
   * The levels a create is in flight for. Not part of `NoteExplorerControls`:
   * it is the state of a MUTATION the tree does not own — the row menu's "New
   * note inside" runs it too — so it comes from the panel, which can see the
   * mutation cache.
   */
  pendingParentIds?: ReadonlySet<string | null>;
  /**
   * Row actions (archive, delete), rendered at the end of the row.
   *
   * A slot rather than an import: the menu is a feature, and an entity that
   * imported one would invert the layering AGENTS §3 sets out. The widget
   * that owns the tree passes it down.
   */
  renderActions?: (node: NoteTreeNode) => React.ReactNode;
  /**
   * Wraps the ROW (not the children list) — how the drag-and-drop feature
   * attaches its handles and drop targets without this entity ever importing
   * dnd-kit. Same layering rule as `renderActions`.
   */
  renderRowShell?: (
    node: NoteTreeNode,
    row: React.ReactNode
  ) => React.ReactNode;
  /**
   * Wraps the row again, outside the drag shell, to give it a right-click
   * menu. Separate from `renderRowShell` because the two come from different
   * features — dnd from `note-explorer`, the menu from `note-actions` — and
   * composing them here rather than in one slot keeps either one removable.
   */
  renderContextMenu?: (
    node: NoteTreeNode,
    row: React.ReactNode
  ) => React.ReactNode;
}

export function NoteTreeItem({
  node,
  activeId,
  depth = 0,
  includeArchived = false,
  explorer,
  onSelect,
  pendingParentIds,
  renderActions,
  renderRowShell,
  renderContextMenu,
}: NoteTreeItemProps) {
  const t = useTranslations('dashboard.note');
  const prefetch = useNotePrefetch();
  const rowRef = useRef<HTMLLIElement>(null);

  const isExpanded = explorer.expandedIds.has(node.id);
  const isActive = node.id === activeId;
  const isSelected = explorer.selectedId === node.id;
  const isRenaming = explorer.renamingId === node.id;
  /** A draft row belongs to THIS level when its parent is this node. */
  const hasDraft = explorer.draft?.parentId === node.id;
  /** …and so does a create still in flight, which is the draft's next moment. */
  const isCreatingHere = pendingParentIds?.has(node.id) ?? false;

  /**
   * This row's own level, one page at a time.
   *
   * `enabled: isExpanded` is the whole point: a collapsed folder costs
   * nothing, and TanStack keeps an expanded one's pages cached, so collapsing
   * and re-expanding is instant rather than a second round trip. The old
   * component recursed over a `children` array that a single whole-corpus
   * query had already paid for — the cost the explorer is losing here.
   */
  const level = useInfiniteQuery({
    queryKey: noteKeys.children(node.id, includeArchived),
    queryFn: async ({ pageParam }) => {
      const res = await getNoteChildren({
        parentId: node.id,
        includeArchived,
        cursor: pageParam,
      });
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: isExpanded,
  });

  const childRows = level.data?.pages.flatMap((page) => page.rows) ?? NO_ROWS;

  // `childCount` rides along on the row itself, so the chevron is correct
  // BEFORE a single child has been fetched — the entire reason that field
  // exists. Deriving it from `childRows` instead would leave every collapsed
  // folder looking like a leaf until the author clicked it to find out.
  const hasChildren = node.childCount > 0;

  // Hover and keyboard focus both mean "about to open this", and both give
  // the document a head start the click itself cannot. Folders have no
  // document to fetch; the note already on screen is already in cache.
  const warm = () => {
    if (node.isFolder || isActive) return;
    prefetch(node.id);
  };

  // Reveal: this row was asked for by something outside the tree — the command
  // palette, a `[[` link, a reload deep inside collapsed folders. Scrolling
  // happens on MOUNT rather than after a delay because the row does not exist
  // until its level query resolves, so there is no interval worth guessing;
  // see the comment on `revealId`.
  const { revealId, clearReveal } = explorer;
  useEffect(() => {
    if (revealId !== node.id) return;
    rowRef.current?.scrollIntoView({ block: 'nearest' });
    clearReveal();
  }, [revealId, node.id, clearReveal]);

  // Roving tabindex: the selected row takes focus so the next arrow key has
  // somewhere to arrive. Guarded on focus ALREADY being inside the tree —
  // otherwise opening a note from the command palette would yank the caret out
  // of whatever the author was typing in, which is the opposite of helpful.
  useEffect(() => {
    if (!isSelected) return;
    const row = rowRef.current;
    if (!row) return;
    const tree = row.closest('[role="tree"]');
    if (tree?.contains(document.activeElement)) row.focus();
  }, [isSelected]);

  const row = (
    <NoteRow
      node={node}
      depth={depth}
      isActive={isActive}
      isSelected={isSelected}
      isExpanded={isExpanded}
      hasChildren={hasChildren}
      onToggle={() => explorer.toggle(node.id)}
      // A folder has no document to open — clicking it expands it, the way
      // Obsidian's file explorer behaves. Either way it becomes the explorer's
      // selection, which is what decides where the next new note is written.
      onActivate={() => {
        explorer.select(node.id);
        if (node.isFolder) {
          explorer.toggle(node.id);
        } else {
          onSelect(node.id);
        }
      }}
      onStartRename={() => explorer.startRename(node.id)}
      onWarm={warm}
      expandLabel={t('tree.expandAriaLabel')}
      collapseLabel={t('tree.collapseAriaLabel')}
      actions={renderActions?.(node)}
    />
  );

  // Renaming replaces the row outright rather than overlaying it, so the drag
  // shell and the context menu are skipped too: dragging or right-clicking a
  // half-typed name is not a gesture with a meaning.
  const shelled = isRenaming ? (
    <NoteRowInput
      depth={depth}
      isFolder={node.isFolder}
      defaultValue={node.title}
      label={t('tree.renameInputLabel')}
      onSubmit={(value) =>
        explorer.submitRename(node.id, value, node.title)
      }
      onCancel={explorer.cancelRename}
    />
  ) : (
    // Context menu INSIDE the drag shell, wrapping the row element itself.
    //
    // The order matters and the other way round does not work. Radix's
    // `ContextMenuTrigger asChild` clones its child to attach `onContextMenu`
    // and a ref — which an intrinsic `<div>` accepts and a component that does
    // not forward its extra props silently drops. `TreeRowDndShell` takes only
    // `{node, children}`, so wrapping IT meant the handler was never bound:
    // right-clicking a row selected the word under the cursor and opened
    // nothing. Verified in the browser before this was flipped.
    (() => {
      const menued = renderContextMenu ? renderContextMenu(node, row) : row;
      return renderRowShell ? renderRowShell(node, menued) : menued;
    })()
  );

  // An expanded folder needs its children list even when it has none of its
  // own yet — that is exactly the case where a draft row is being typed into
  // an empty folder, or where the create it committed is still in flight.
  const showChildren = isExpanded && (hasChildren || hasDraft || isCreatingHere);

  return (
    <li
      ref={rowRef}
      role="treeitem"
      aria-level={depth + 1}
      aria-selected={isSelected}
      aria-expanded={hasChildren ? isExpanded : undefined}
      tabIndex={isSelected ? 0 : -1}
      // Focus stays HERE — the roving tabindex needs one element per row and
      // this is it — but nothing is painted here any more. This `li` wraps the
      // row AND, when the folder is open, its whole children list, so a ring on
      // it drew a box around the entire subtree. `group/row` is how the row
      // below reaches this element's focus state instead; see
      // `NOTE_ROW_FOCUS_CLASS`.
      className="group/row rounded-md outline-none"
      // `stopPropagation` is REQUIRED, not tidiness. A child's `li` is nested
      // inside its parent's `li` — that is what makes the tree a tree — so a
      // click on a row bubbles through every ancestor row's handler, and the
      // outermost one wins because it runs last. Observed in the browser:
      // clicking a note three levels down opened the right note but selected
      // its top-level folder, so F2 then renamed the FOLDER.
      onClick={(event) => {
        event.stopPropagation();
        explorer.select(node.id);
      }}
    >
      {shelled}

      {showChildren && (
        // `aria-busy` rather than a live region: the placeholder below is
        // decorative, and this is the standard way to say "the contents of
        // this container are not final yet" without inventing a string. A
        // create landing in this level says the same thing about it.
        <ul
          role="group"
          aria-busy={level.isPending || isCreatingHere ? true : undefined}
        >
          {childRows.map((child) => (
            <NoteTreeItem
              key={child.id}
              node={child}
              activeId={activeId}
              depth={depth + 1}
              includeArchived={includeArchived}
              explorer={explorer}
              onSelect={onSelect}
              pendingParentIds={pendingParentIds}
              renderActions={renderActions}
              renderRowShell={renderRowShell}
              renderContextMenu={renderContextMenu}
            />
          ))}

          {/* The draft row sits at the END of the level, which is also where
              `createNote` will put the real one: it assigns
              `position = last + 1`. Typing a name and watching the row stay
              put is the point. */}
          {hasDraft && explorer.draft && (
            <li>
              <NoteRowInput
                depth={depth + 1}
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

          {/* The create the draft committed, still in flight — at the end of
              the level, where the draft stood and where `createNote` puts the
              real row. Without it the level snaps back to how it looked before
              the author typed anything. */}
          {isCreatingHere && (
            <li aria-hidden>
              <NoteRowSkeleton depth={depth + 1} index={childRows.length} />
            </li>
          )}

          {/* An expanded folder whose first page is still in flight would
              otherwise render an empty list, which reads as "this folder is
              empty" — a lie the author has no way to distinguish from the
              truth. The placeholder is row-SHAPED (same height, same indent,
              same icon column) because the previous one — a lone `h-6` bar
              floating in no column — did not read as an arriving child at
              all. See `note-row-shell.ts`. */}
          {level.isPending && (
            // Wrapped in `<li>` because `NoteRowSkeleton` is a `div` — it also
            // serves the flat and grouped views, which are not `ul`s. Same
            // reason the sentinel below carries its own wrapper.
            <li aria-hidden>
              <NoteRowSkeleton depth={depth + 1} index={0} />
              <NoteRowSkeleton depth={depth + 1} index={1} />
            </li>
          )}

          {/* `isLoadingError`, not `isError`: a failed BACKGROUND refetch
              leaves the previously-loaded rows in place and must not replace
              them with an error line. Same distinction the panel documents at
              length for the root level. */}
          {level.isLoadingError && (
            <li
              className="py-1 text-xs text-destructive"
              style={noteRowIndent(depth + 1)}
            >
              {t('errors.load')}
            </li>
          )}

          {/* The `hasNextPage` test is repeated out here (the sentinel also
              renders nothing without it) so a `<div>` never becomes a direct
              child of this `<ul>`. */}
          {level.hasNextPage && (
            <li>
              <InfiniteSentinel
                hasNextPage={level.hasNextPage}
                isFetching={level.isFetching}
                onLoadMore={() => void level.fetchNextPage()}
              />
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
