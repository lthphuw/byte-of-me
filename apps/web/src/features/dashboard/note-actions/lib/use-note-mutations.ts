'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { archiveNote, deleteNote, noteKeys, restoreNote } from '@/entities/note';

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
    void queryClient.invalidateQueries({ queryKey: noteKeys.tree(false) });
    void queryClient.invalidateQueries({ queryKey: noteKeys.tree(true) });
    void queryClient.invalidateQueries({ queryKey: noteKeys.searchAll() });
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
      invalidateLists();
      toast.success(t('toasts.deleted'));
      onRemoved?.(id);
    },
    onError: (error: Error) => {
      toast.error(t('errors.delete'), { description: error.message });
    },
  });

  return { archive, restore, remove };
}
