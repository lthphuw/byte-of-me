'use client';

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteNoteDocument } from '@/entities/note-document/api/delete-note-document';
import { noteDocumentKeys } from '@/entities/note-document/model/query-keys';

/** See `UseUploadNoteDocumentMessages` for why this hook takes strings. */
export interface UseDeleteNoteDocumentMessages {
  /** The attachment is gone. */
  removed: string;
  /** It is not — the reason goes in the description. */
  error: string;
}

/**
 * Removes one attachment from `noteId`'s list.
 *
 * The note id is a parameter rather than being derived from the response
 * because the invalidation needs it: `deleteNoteDocument` returns the document
 * id, and the list key is per note.
 */
export function useDeleteNoteDocument(
  noteId: string,
  messages?: UseDeleteNoteDocumentMessages
) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (documentId: string) => {
      const res = await deleteNoteDocument(documentId);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: noteDocumentKeys.list(noteId),
      });
      toast(messages ? messages.removed : 'Attachment removed');
    },
    onError: (error) =>
      toast.error(messages ? messages.error : 'Could not delete attachment', {
        description: error.message,
      }),
  });

  const { mutateAsync } = mutation;

  const remove = useCallback(
    async (documentId: string) => {
      // Swallowed on purpose: `onError` has already told the author. A
      // rejection here would surface as an unhandled promise in the row's
      // click handler.
      await mutateAsync(documentId).catch(() => undefined);
    },
    [mutateAsync]
  );

  return { remove, isPending: mutation.isPending };
}
