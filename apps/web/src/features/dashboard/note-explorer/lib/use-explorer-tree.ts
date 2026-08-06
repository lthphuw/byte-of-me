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
