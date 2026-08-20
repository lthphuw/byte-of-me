'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { getNoteDocuments } from '@/entities/note-document/api/get-note-documents';
import { noteDocumentKeys } from '@/entities/note-document/model/query-keys';
import type { NoteDocumentSummary } from '@/entities/note-document/model/types';

/**
 * One note's attachments, newest first.
 *
 * `noteId` is nullable because the Files panel lives in a sidebar that is
 * mounted with no note selected — the query is simply disabled there rather
 * than the panel having to guard every render.
 *
 * The envelope is unwrapped here, so consumers get `data` / `isError` from
 * TanStack rather than a success flag they have to branch on twice (the
 * pattern `use-note-properties.ts` uses).
 */
export function useNoteDocuments(
  noteId: string | null
): UseQueryResult<NoteDocumentSummary[]> {
  return useQuery({
    // `?? ''` never reaches the network: `enabled` is false in exactly the
    // case that produces it. It exists so the key stays a plain string tuple.
    queryKey: noteDocumentKeys.list(noteId ?? ''),
    queryFn: async () => {
      if (!noteId) return [];

      const res = await getNoteDocuments(noteId);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    enabled: noteId !== null,
  });
}
