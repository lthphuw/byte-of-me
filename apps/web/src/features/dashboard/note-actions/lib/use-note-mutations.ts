'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  archiveNote,
  createNote,
  deleteLocalNote,
  deleteNote,
  noteKeys,
  restoreNote,
  updateNote,
} from '@/entities/note';

/**
 * Invalidates every list a note can appear in, and only those.
 *
 * Both tree variants (a note leaving the live tree is a note joining the
 * archived one), plus the whole search cache — the empty-term search the
 * palette runs on open lists notes by `updatedAt desc` and must not keep
 * offering a note that has just been archived or deleted.
 *
 * `noteKeys.all` is deliberately NOT used: it prefix-matches `detail` too, and
 * `use-note-editor-autosave.ts` documents at length why a broad invalidation
 * that reaches `detail` is a hazard around a debounced save. These three
 * mutations are one-shot, but there is no reason to reach a key none of them
 * changes.
 */
function useInvalidateNoteLists() {
  const queryClient = useQueryClient();

  return () => {
    // Every list-shaped key, not just the tree: the explorer now reads
    // per-level `children` keys, which `tree` does not prefix-match.
    for (const queryKey of noteKeys.lists()) {
      void queryClient.invalidateQueries({ queryKey });
    }
    void queryClient.invalidateQueries({ queryKey: noteKeys.searchAll() });
    // Create/archive/restore/delete all change the NODE set the graph plots
    // — and deleting a note takes its links with it, so the edge set moves
    // too. The tree keys above cannot stand in for this: the graph excludes
    // folders and archived notes, so it is a different question entirely.
    void queryClient.invalidateQueries({ queryKey: noteKeys.graph() });
  };
}

interface UseNoteMutationsOptions {
  /**
   * Called once the note is gone from wherever it was — the caller decides
   * whether that means navigating away (the note was the one open) or nothing
   * at all (it was another row in the tree).
   */
  onRemoved?: (noteId: string) => void;
}

export function useNoteMutations({ onRemoved }: UseNoteMutationsOptions = {}) {
  const t = useTranslations('dashboard.note');
  const queryClient = useQueryClient();
  const invalidateLists = useInvalidateNoteLists();

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const res = await archiveNote(id);
      if (!res.success) throw new Error(res.errorMsg);
      return id;
    },
    onSuccess: (id) => {
      invalidateLists();
      toast.success(t('toasts.archived'));
      onRemoved?.(id);
    },
    onError: (error: Error) => {
      toast.error(t('errors.archive'), { description: error.message });
    },
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const res = await restoreNote(id);
      if (!res.success) throw new Error(res.errorMsg);
      return id;
    },
    onSuccess: () => {
      invalidateLists();
      toast.success(t('toasts.restored'));
    },
    onError: (error: Error) => {
      toast.error(t('errors.restore'), { description: error.message });
    },
  });

  const pin = useMutation({
    mutationFn: async (input: { id: string; isPinned: boolean }) => {
      const res = await updateNote(input);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    onSuccess: (data) => {
      // Straight into the detail key, the way every other `updateNote`
      // caller applies its result (see `applySaveResult` in the autosave and
      // `useNoteProperties`) — the row differs from the buffer only in
      // `isPinned`/`updatedAt`, so the autosave's reseed guard stays inert.
      queryClient.setQueryData(noteKeys.detail(data.id), data);
      // Every list-shaped key, not just the tree: the explorer now reads
      // per-level `children` keys, which `tree` does not prefix-match.
      for (const queryKey of noteKeys.lists()) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
    onError: (error: Error) => {
      toast.error(t('errors.save'), { description: error.message });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteNote(id);
      if (!res.success) throw new Error(res.errorMsg);
      return id;
    },
    onSuccess: (id) => {
      // `removeQueries`, not `invalidateQueries`: the note no longer exists,
      // so refetching its detail would just produce an error state for a
      // document nobody can open. Descendants go with it through the database
      // cascade, but their cached details are addressed by ids this callback
      // does not know — the tree invalidation above is what removes them from
      // view, and a stale detail entry for an unreachable note is harmless.
      queryClient.removeQueries({ queryKey: noteKeys.detail(id) });
      // The browser's own copy goes too. A stale in-memory cache entry is
      // harmless; a stale IndexedDB record is not, because `useNoteSyncQueue`
      // reads those back and would try to resend a note that no longer
      // exists. Descendants are again not knowable from here — the queue
      // drops any local copy whose note the server no longer returns, which
      // is what actually cleans up after a cascade.
      void deleteLocalNote(id);
      invalidateLists();
      toast.success(t('toasts.deleted'));
      onRemoved?.(id);
    },
    onError: (error: Error) => {
      toast.error(t('errors.delete'), { description: error.message });
    },
  });

  return { archive, restore, remove, pin };
}

/**
 * The one create-note mutation, shared by the tree panel's `+` button and the
 * command palette's "New note" action — two implementations of one thing is
 * the bug AGENTS §11.3 names, and this used to live inline in the panel.
 *
 * `searchAll` IS invalidated, unlike in the autosave's `applySaveResult`: the
 * empty-term search (what the palette runs on open) lists every note by
 * `updatedAt desc`, so a brand-new note belongs at the top of it — and, being
 * new, no previously cached search result holds a stale copy to race with.
 */
export function useCreateNote(
  onCreated?: (noteId: string) => void,
  /**
   * Fired for EVERY created row, folders included — unlike `onCreated`, which
   * fires only for notes because it means "open this in the editor" and a
   * folder has no document to open.
   *
   * The tree uses it to make the new row the explorer's selection, so that
   * pressing `n` twice creates two siblings rather than two rows in whatever
   * was selected before.
   */
  onCreatedRow?: (note: { id: string; isFolder: boolean }) => void
) {
  const t = useTranslations('dashboard.note');
  const invalidateLists = useInvalidateNoteLists();

  return useMutation({
    /**
     * No variables = an untitled root note; pass `parentId` to create
     * inside a folder (or any note), `isFolder` for an Obsidian folder.
     *
     * `title` is optional and defaults to the placeholder, so every existing
     * caller is unaffected (AGENTS §11.6). It exists for the tree's draft row,
     * which asks for the name BEFORE the note exists — the author types it into
     * the row itself and this creates the note already named, instead of
     * creating an "Untitled" one and renaming it a moment later.
     */
    mutationFn: async (
      variables: {
        parentId?: string | null;
        isFolder?: boolean;
        title?: string;
      } = {}
    ) => {
      const res = await createNote({
        title:
          variables.title ??
          (variables.isFolder ? t('untitledFolder') : t('untitled')),
        parentId: variables.parentId ?? null,
        isFolder: variables.isFolder ?? false,
      });
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    onSuccess: (note) => {
      invalidateLists();
      onCreatedRow?.(note);
      // Folders have no document to open — they get renamed in place
      // instead of navigating to an editor that means nothing for them.
      if (!note.isFolder) onCreated?.(note.id);
    },
    onError: (error: Error) => {
      toast.error(t('errors.create'), { description: error.message });
    },
  });
}

/** Renames a note/folder from the tree, without opening the editor. */
export function useRenameNote() {
  const t = useTranslations('dashboard.note');
  const queryClient = useQueryClient();
  const invalidateLists = useInvalidateNoteLists();

  return useMutation({
    mutationFn: async (input: { id: string; title: string }) => {
      const res = await updateNote(input);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(noteKeys.detail(data.id), data);
      invalidateLists();
    },
    onError: (error: Error) => {
      toast.error(t('errors.save'), { description: error.message });
    },
  });
}
