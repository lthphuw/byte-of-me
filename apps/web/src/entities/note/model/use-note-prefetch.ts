'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { getAdminNoteById } from '@/entities/note/api/get-admin-note-by-id';
import { noteKeys } from '@/entities/note/model/query-keys';

/**
 * How long a just-prefetched note counts as fresh. Long enough that the
 * `useQuery` in `use-note-editor-autosave` — which mounts a few hundred
 * milliseconds later, when the author actually clicks — reads the warm cache
 * instead of firing its own request; short enough that it is still a
 * prefetch and not a second, silent source of truth. The editor's own query
 * keeps the hook's default `staleTime` of 0, so it refetches in the
 * background as usual once this window closes.
 */
const PREFETCH_STALE_MS = 30_000;

/**
 * Warms `noteKeys.detail(id)` before the author commits to opening a note.
 *
 * The first open of any note was measured at ~1.5s on a local dev server
 * with a warm tree: ~0.5s for React to swap the editor pane and ~1s waiting
 * on `getAdminNoteById`. Nothing about that second is avoidable at click
 * time — `(protected)/layout.tsx` is `force-dynamic`, so the action pays an
 * auth check and a query on every call — but it can be spent earlier, while
 * the pointer is still travelling towards the row.
 *
 * It lives in the entity, not in a feature, because both row components that
 * need it (`NoteTreeItem` here, and `ExplorerRow` in the note-explorer
 * feature) would otherwise have to take it as a prop threaded down from the
 * widget through four layers. The query key and fetcher are the note
 * entity's own; nothing about warming them belongs to a feature.
 */
export function useNotePrefetch() {
  const queryClient = useQueryClient();

  return useCallback(
    (noteId: string) => {
      void queryClient.prefetchQuery({
        queryKey: noteKeys.detail(noteId),
        queryFn: async () => {
          const res = await getAdminNoteById(noteId);
          if (!res.success) throw new Error(res.errorMsg);
          return res.data;
        },
        staleTime: PREFETCH_STALE_MS,
      });
    },
    [queryClient]
  );
}
