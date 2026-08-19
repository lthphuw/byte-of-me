'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  getAdminNoteById,
  getNoteLabels,
  noteKeys,
  type NoteProperties,
  setNoteLabels,
  updateNote,
} from '@/entities/note';

/**
 * The properties panel's own read + write for one note.
 *
 * The read shares `noteKeys.detail(noteId)` with `useNoteEditorAutosave`, so
 * TanStack serves both from one fetch. The write goes through `updateNote`
 * with ONLY `status`/`properties` — never title/content — and applies the
 * result the same way the autosave does: written straight into the detail
 * key. That interplay is safe by the autosave's own reseed guard: the row
 * comes back with the same title/content the buffer already holds, so a
 * diverged (mid-typing) buffer is never overwritten, and an undiverged one
 * reseeds to identical values — no visible change, no editor remount.
 */
export function useNoteProperties(noteId: string) {
  const t = useTranslations('dashboard.note');
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: noteKeys.detail(noteId),
    queryFn: async () => {
      const res = await getAdminNoteById(noteId);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (input: {
      status?: string;
      properties?: NoteProperties;
    }) => {
      const res = await updateNote({ id: noteId, ...input });
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(noteKeys.detail(noteId), data);
      // The explorer's grouped view buckets by status, so a status change
      // moves this row between buckets and changes both bucket counts —
      // that, and nothing else. A PROPERTIES edit changes nothing any list
      // draws: no row renders a property.
      //
      // This used to invalidate the whole `lists()` family, which is exactly
      // the cost `applySaveResult` in `use-note-editor-autosave.ts` documents
      // narrowing away: the root level, every expanded folder, `page`,
      // `groups`, `group-rows`, `descendantCountAll` and `ancestorsAll` — one
      // server action each, each paying its own `requireAdmin()` — for a tree
      // whose shape had not moved.
      if (variables.status === undefined) return;
      for (const queryKey of [noteKeys.groupsAll(), noteKeys.groupRowsAll()]) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
    onError: (error: Error) => {
      toast.error(t('errors.save'), { description: error.message });
    },
  });

  // The owner's whole label list — powers the datalist suggestions.
  const labelsQuery = useQuery({
    queryKey: noteKeys.labels(),
    queryFn: async () => {
      const res = await getNoteLabels();
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
  });

  const saveLabels = useMutation({
    /** The COMPLETE next name set — `setNoteLabels` replaces, never merges. */
    mutationFn: async (names: string[]) => {
      const res = await setNoteLabels({ noteId, names });
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    onSuccess: (labels) => {
      // Surgical detail update (labels only — content stays whatever the
      // buffer holds) + the lists that render label groupings.
      queryClient.setQueryData(
        noteKeys.detail(noteId),
        (old: (typeof query)['data']) => (old ? { ...old, labels } : old)
      );
      void queryClient.invalidateQueries({ queryKey: noteKeys.labels() });
      // Same narrowing as the status edit above, for the same reason: the
      // grouped view can bucket by label, and no row renders a label, so the
      // grouped view is the only list a label change can move.
      for (const queryKey of [noteKeys.groupsAll(), noteKeys.groupRowsAll()]) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
    onError: (error: Error) => {
      toast.error(t('errors.save'), { description: error.message });
    },
  });

  return {
    note: query.data,
    save: mutation,
    allLabels: labelsQuery.data ?? [],
    saveLabels,
  };
}
