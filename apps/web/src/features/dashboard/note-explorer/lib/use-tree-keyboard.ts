'use client';

import { useMemo } from 'react';
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
} from '@/features/dashboard/note-explorer/lib/explorer-model';

/**
 * Every row the tree is drawing, in screen order — what the arrow keys walk.
 *
 * Read straight out of the per-level caches rather than tracked separately: the
 * levels settle inside `NoteTreeItem`, a child the panel does not re-render
 * for, so a list kept in the panel would go stale the moment a folder expanded.
 */
export function useVisibleTreeRows(
  rootRows: readonly NoteTreeNode[],
  expandedIds: ReadonlySet<string>,
  includeArchived: boolean
): VisibleRow[] {
  const queryClient = useQueryClient();

  return useMemo(
    () =>
      flattenVisibleRows(rootRows, expandedIds, (parentId) => {
        const level = queryClient.getQueryData<
          InfiniteData<NotePage<NoteTreeNode>>
        >(noteKeys.children(parentId, includeArchived));
        return level?.pages.flatMap((page) => page.rows);
      }),
    [rootRows, expandedIds, queryClient, includeArchived]
  );
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
   * lives in `features/dashboard/note-actions`, and a feature importing a
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
