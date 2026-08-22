'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  getAdminNoteById,
  getNoteLabels,
  type NoteDetail,
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
 * with ONLY `status`/`properties` — never title/content — and MERGES those
 * same two fields into the detail key, the way `saveLabels` below has always
 * merged `labels`.
 *
 * It used to write the whole response row instead, on the argument that the
 * row "comes back with the same title/content the buffer already holds". That
 * held only while nothing was in flight. The row is read at the server's
 * clock, so its body is the DATABASE's copy — older than a buffer being typed
 * into, and older than a save that has left but not landed — while its
 * `updatedAt` is newer than anything the editor has recorded. That pair is
 * exactly what the autosave's catch-up treats as "the server moved on, take
 * its version", so setting a status could roll the open document back to its
 * last-persisted text. `updateNote` no longer returns `content` at all; this
 * merge is the other half, keeping `title` out of a write that never touched
 * it.
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
      // Server-normalised (`updateNoteSchema` trims `status` and every
      // `properties` key), so this takes the response's values rather than
      // the ones that were sent — but only for the two fields this mutation
      // owns.
      queryClient.setQueryData<NoteDetail>(noteKeys.detail(noteId), (old) =>
        old
          ? {
              ...old,
              status: data.status,
              properties: data.properties,
              updatedAt: data.updatedAt,
            }
          : old
      );
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
