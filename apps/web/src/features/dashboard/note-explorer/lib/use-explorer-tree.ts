'use client';

import { useCallback, useMemo, useState } from 'react';

import type {
  NoteDraft,
  NoteExplorerControls,
  NoteTreeNode,
} from '@/entities/note';
import { resolveCreateTarget } from '@/features/dashboard/note-explorer/lib/explorer-model';

interface UseExplorerTreeOptions {
  /**
   * Writes the new note or folder. Supplied by the WIDGET, not called here:
   * the create mutation lives in `features/dashboard/note-actions`, and a
   * feature importing a sibling feature is the sideways import AGENTS §3 rules
   * out — the same reason `note-editor` takes its actions menu as a slot.
   */
  onCreate: (input: {
    parentId: string | null;
    isFolder: boolean;
    title: string;
  }) => void;
  /** Same arrangement for the rename mutation. */
  onRename: (input: { id: string; title: string }) => void;
}

/** `NoteExplorerControls` plus the parts only the panel drives. */
export interface ExplorerTree extends NoteExplorerControls {
  /** Opens a draft row in whichever level `resolveCreateTarget` picks. */
  startDraft: (isFolder: boolean, selected: NoteTreeNode | null) => void;
  expand: (id: string) => void;
  collapse: (id: string) => void;
  /**
   * Drops the explorer's cursor entirely — what clicking the empty space
   * below the rows means. Nothing else in the tree can reach this state: every
   * row click replaces the selection rather than clearing it, so without this
   * the last row clicked stayed highlighted for the rest of the session.
   *
   * Deliberately leaves an open draft or rename alone. Those hold text the
   * author typed, and a stray click on the background is not a reason to throw
   * it away — the inputs handle their own commit and cancel.
   */
  deselect: () => void;
  /**
   * Opens every folder on the path to a note, selects it, and asks for it to
   * be scrolled into view. `ancestorIds` comes from `getNoteAncestors`.
   */
  reveal: (id: string, ancestorIds: readonly string[]) => void;
}

/**
 * All of the tree's interaction state, in one place.
 *
 * It is a hook rather than a context because there is exactly one tree on the
 * page and the panel that owns it is also the only thing that needs to drive it
 * — a provider would buy indirection and nothing else. Rows receive the whole
 * thing as a single `explorer` prop; see `NoteExplorerControls` for why that is
 * one prop instead of eight.
 *
 * ## Re-render cost, measured — do not "optimise" this without re-measuring
 *
 * Because the returned object changes identity whenever any of this state
 * changes, moving the selection re-renders EVERY row, not just the two whose
 * highlight actually moved. That was measured rather than assumed: a 19-row
 * tree, driven through `NoteTreePanel` with a render counter in `NoteRow`,
 * produced exactly 19 row renders per selection change and ~7.9ms per change
 * under happy-dom — roughly 0.4ms per row, and a real browser is several times
 * faster than that.
 *
 * It was left alone deliberately. Making it 2 renders instead of 19 means rows
 * subscribing to slices of this state rather than receiving it — a
 * `useSyncExternalStore` selector store — because `React.memo` cannot help a
 * component that RECURSES: a child's `isSelected` changing has to reach it
 * through a parent whose own props did not change. That is a real rewrite of
 * the tree's data flow, in the file that has already produced three regressions
 * (double-submit on Enter, click bubbling through ancestor rows, and
 * `asChild` losing its handler), for a few milliseconds on a tree that is
 * twenty rows in practice.
 *
 * Re-open it when a tree gets big enough for the number to matter — the
 * measurement above is the baseline to compare against.
 */
export function useExplorerTree({
  onCreate,
  onRename,
}: UseExplorerTreeOptions): ExplorerTree {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<NoteDraft | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [revealId, setRevealId] = useState<string | null>(null);

  const expand = useCallback((id: string) => {
    setExpandedIds((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);

  const collapse = useCallback((id: string) => {
    setExpandedIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  const toggle = useCallback((id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const deselect = useCallback(() => setSelectedId(null), []);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    // Selecting elsewhere abandons an open draft, the way clicking away from a
    // new file in VSCode does. Nothing was written, so there is nothing to
    // warn about.
    setDraft(null);
    setRenamingId(null);
  }, []);

  const startDraft = useCallback(
    (isFolder: boolean, selected: NoteTreeNode | null) => {
      const target = resolveCreateTarget(selected);
      if (target.expandId) expand(target.expandId);
      setRenamingId(null);
      setDraft({ parentId: target.parentId, isFolder });
    },
    [expand]
  );

  const cancelDraft = useCallback(() => setDraft(null), []);

  const submitDraft = useCallback(
    (title: string) => {
      const trimmed = title.trim();
      // An empty name cancels rather than creating an "Untitled" row. That is
      // the difference the draft-row approach buys over creating first and
      // renaming after: Escape — or a blur with nothing typed — leaves the
      // database exactly as it was.
      if (draft && trimmed) {
        onCreate({
          parentId: draft.parentId,
          isFolder: draft.isFolder,
          title: trimmed,
        });
      }
      setDraft(null);
    },
    [draft, onCreate]
  );

  const startRename = useCallback((id: string) => {
    setDraft(null);
    setRenamingId(id);
  }, []);

  const cancelRename = useCallback(() => setRenamingId(null), []);

  const submitRename = useCallback(
    (id: string, title: string) => {
      const trimmed = title.trim();
      if (trimmed) onRename({ id, title: trimmed });
      setRenamingId(null);
    },
    [onRename]
  );

  const reveal = useCallback((id: string, ancestorIds: readonly string[]) => {
    setExpandedIds((current) => {
      // Same bail-out `expand` and `collapse` make, for the same reason: a
      // reveal whose folders are all open already must not hand back a new
      // Set. This object's identity is what every row re-renders on (see the
      // measurement on this hook), and a reveal can be re-requested by a
      // refetch of the ancestor chain — which every save invalidates.
      if (ancestorIds.every((ancestorId) => current.has(ancestorId))) {
        return current;
      }
      const next = new Set(current);
      for (const ancestorId of ancestorIds) next.add(ancestorId);
      return next;
    });
    setSelectedId(id);
    setRevealId(id);
  }, []);

  const clearReveal = useCallback(() => setRevealId(null), []);

  return useMemo(
    () => ({
      selectedId,
      expandedIds,
      draft,
      renamingId,
      revealId,
      select,
      deselect,
      toggle,
      expand,
      collapse,
      startDraft,
      submitDraft,
      cancelDraft,
      startRename,
      submitRename,
      cancelRename,
      reveal,
      clearReveal,
    }),
    [
      selectedId,
      expandedIds,
      draft,
      renamingId,
      revealId,
      select,
      deselect,
      toggle,
      expand,
      collapse,
      startDraft,
      submitDraft,
      cancelDraft,
      startRename,
      submitRename,
      cancelRename,
      reveal,
      clearReveal,
    ]
  );
}
