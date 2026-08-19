'use client';

import { useEffect, useMemo, useState } from 'react';
import { type InfiniteData, useQueryClient } from '@tanstack/react-query';

import {
  type NoteExplorerControls,
  noteKeys,
  type NotePage,
  type NoteTreeNode,
} from '@/entities/note';
import {
  type ArrowKey,
  flattenVisibleRows,
  navigate,
  type VisibleRow,
} from '@/features/notes/note-explorer/lib/explorer-model';
import { isModalOpen } from '@/shared/lib/is-modal-open';

/**
 * Every row the tree is drawing, in screen order — what the arrow keys walk.
 *
 * Read straight out of the per-level caches rather than tracked separately: the
 * levels settle inside `NoteTreeItem`, a child the panel does not re-render
 * for, so a list kept in the panel would go stale the moment a folder expanded.
 *
 * That reasoning was right about the problem and wrong about the solution.
 * `getQueryData` is a plain read — it subscribes to nothing — so the memo below
 * kept whatever the cache held at the instant the folder expanded, which is
 * NOTHING: the level query has not resolved yet, and when it does, not one of
 * this hook's dependencies changes. `useLevelVersion` is what closes that gap.
 */
export function useVisibleTreeRows(
  rootRows: readonly NoteTreeNode[],
  expandedIds: ReadonlySet<string>,
  includeArchived: boolean
): VisibleRow[] {
  const queryClient = useQueryClient();
  const levelVersion = useLevelVersion(queryClient);

  return useMemo(
    () =>
      flattenVisibleRows(rootRows, expandedIds, (parentId) => {
        const level = queryClient.getQueryData<
          InfiniteData<NotePage<NoteTreeNode>>
        >(noteKeys.children(parentId, includeArchived));
        return level?.pages.flatMap((page) => page.rows);
      }),
    // `levelVersion` is not read in the body and is not meant to be: it is the
    // subscription token that makes the non-reactive `getQueryData` reads above
    // re-run when a level lands. Dropping it is the bug described on the hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rootRows, expandedIds, queryClient, includeArchived, levelVersion]
  );
}

/**
 * A counter bumped whenever a TREE LEVEL's cache entry changes.
 *
 * ## What went wrong without it, measured
 *
 * A tree of four root folders, one expanded with three notes inside. The DOM
 * had seven `treeitem`s; `rows` had four. Every consequence follows from that
 * one gap:
 *
 * - ArrowDown stepped from the open folder straight to the NEXT ROOT FOLDER,
 *   over three visible children.
 * - Clicking a child selected it, but `navigate` could not find its id in
 *   `rows`, and `index === -1` is the branch that means "nothing is selected" —
 *   which it answers by jumping to the first row. So one arrow key after a
 *   mouse click threw the cursor back to the top of the tree.
 * - `selectedNode` went `null` for the same reason, and `selectedNode` is what
 *   F2, Delete/Backspace and `n` all guard on. Every one of them quietly did
 *   nothing on a child row, with no error to explain it.
 *
 * ## Why a cache subscription rather than lifting the queries
 *
 * The panel could own every expanded level itself with `useQueries` and get
 * reactivity for free — but then a level is fetched by the panel AND by the
 * `NoteTreeItem` that draws it, and the two would have to be kept in step
 * forever. The rows already live in exactly one place; only the notification
 * was missing.
 */
function useLevelVersion(queryClient: ReturnType<typeof useQueryClient>) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const prefix = noteKeys.childrenAll();

    return queryClient.getQueryCache().subscribe((event) => {
      // `updated`/`success` and nothing else, for two separate reasons.
      //
      // The other event types are USELESS here: a fetch start is precisely the
      // moment the rows have not arrived, and an observer mount carries no data
      // at all — reacting to either re-runs the walk against the same cache and
      // re-renders every row for nothing.
      //
      // `added` is worse than useless, it is illegal. TanStack creates the
      // query object inside `useInfiniteQuery` DURING RENDER, so the `added`
      // event fires while `NoteTreeItem` is rendering — and this hook lives in
      // `NoteTreePanel`, an ancestor. React refused it outright: "Cannot update
      // a component (NoteTreePanel) while rendering a different component
      // (NoteTreeItem)", and the expand it fired from never completed.
      //
      // Nothing is lost by dropping them. A level's rows can only appear via a
      // resolved fetch or a `setQueryData`, and both dispatch `success`; a level
      // can only be GC'd once nothing observes it, which means the folder was
      // collapsed — and `expandedIds` changing already re-runs the memo.
      if (event.type !== 'updated' || event.action.type !== 'success') return;

      // `childrenAll()` rather than a literal, for the reason `query-keys.ts`
      // opens with. It is a prefix, so this is a prefix test.
      const key = event.query.queryKey;
      if (prefix.some((part, index) => key[index] !== part)) return;

      setVersion((current) => current + 1);
    });
  }, [queryClient]);

  return version;
}

interface UseTreeKeyboardOptions {
  rows: readonly VisibleRow[];
  explorer: Pick<
    NoteExplorerControls,
    'selectedId' | 'expandedIds' | 'select' | 'toggle' | 'startRename'
  > & {
    expand: (id: string) => void;
    collapse: (id: string) => void;
    startDraft: (isFolder: boolean, selected: NoteTreeNode | null) => void;
  };
  /** The trash has no create, rename or archive. */
  includeArchived: boolean;
  onOpenNote: (noteId: string) => void;
  /**
   * Archives the selected row. Passed in rather than called here: the mutation
   * lives in `features/notes/note-actions`, and a feature importing a
   * sibling feature is the sideways import AGENTS §3 rules out.
   */
  onArchive: (noteId: string) => void;
}

/**
 * The tree's keyboard model.
 *
 * The returned handler is bound on the tree's SCROLL CONTAINER, so it sees
 * every row's bubbled event without any row registering itself, and it is
 * scoped to the tree by construction — outside it no row has focus, so nothing
 * fires.
 *
 * `Cmd+N` is NOT among these bindings and cannot be: browsers consume it before
 * a page ever sees a `keydown`, so `preventDefault` has nothing to prevent.
 * VSCode can bind it because it is not in a browser. The bare keys here are the
 * web equivalent, and they are safe precisely because they only apply while
 * focus is inside the tree — the draft and rename inputs stop their own
 * keystrokes from reaching here (see `NoteRowInput`).
 */
export function useTreeKeyboard({
  rows,
  explorer,
  includeArchived,
  onOpenNote,
  onArchive,
}: UseTreeKeyboardOptions) {
  const selectedNode =
    rows.find((row) => row.node.id === explorer.selectedId)?.node ?? null;

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    // A dialog owns the keyboard while it is open, and the tree's focus trap
    // is not enough to guarantee that here. Radix returns focus to a menu's
    // trigger when the menu closes, and the note menu's trigger sits INSIDE
    // this scroller — so opening the share dialog from that menu left focus on
    // an element whose keydowns still bubbled into this handler. Observed:
    // Delete with the share dialog open archived the folder behind it, taking
    // its whole subtree along.
    if (isModalOpen()) return;

    const key = event.key;

    if (
      key === 'ArrowUp' ||
      key === 'ArrowDown' ||
      key === 'ArrowLeft' ||
      key === 'ArrowRight'
    ) {
      const intent = navigate(
        key as ArrowKey,
        rows,
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
        onOpenNote(selectedNode.id);
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

    // Both keys, deliberately: a MacBook has no dedicated Delete, so Backspace
    // is the only one those keyboards can offer. Archiving is reversible — the
    // note lands in the trash and the toast says so — which is what makes an
    // unconfirmed keystroke acceptable here. A permanent delete still requires
    // the menu and its confirmation.
    if (key === 'Delete' || key === 'Backspace') {
      if (!selectedNode || includeArchived) return;
      event.preventDefault();
      onArchive(selectedNode.id);
    }
  };

  return { selectedNode, onKeyDown };
}
