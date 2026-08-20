'use client';

import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { uploadNoteDocument } from '@/entities/note-document/api/upload-note-document';
import {
  describeDocumentViolation,
  type DocumentValidationError,
  findDocumentViolation,
} from '@/entities/note-document/model/document-constraints';
import { noteDocumentKeys } from '@/entities/note-document/model/query-keys';

/**
 * Whole, pre-translated toast sentences (the i18n path). When supplied, each
 * is used verbatim instead of the English literal below.
 *
 * This hook lives in `entities/`, which must not decide which `dashboard.*`
 * namespace owns the copy or call `useTranslations` itself — the caller (a
 * feature that already knows its namespace) passes translated strings, exactly
 * as `UseMediaLibraryMessages` prescribes for the media entity.
 */
export interface UseUploadNoteDocumentMessages {
  /** One or more files attached. */
  added: string;
  /** A file could not be attached — the reason goes in the description. */
  error: string;
  /**
   * Turns a structured violation into the author's language.
   *
   * Optional because the action already returns an English backstop; supply it
   * and a file rejected on the client (before any request) reads the same as
   * everything else on screen. `errors.type` takes `{fileName}`; `errors.size`
   * also `{maxSizeMb}`.
   */
  describeViolation?: (violation: DocumentValidationError) => string;
}

/**
 * Attaches PDFs to one note, one request per file.
 *
 * Sequential and not `Promise.all`: every file travels in its own server
 * action request because `serverActions.bodySizeLimit` would refuse a batch
 * before our validation could name the offending file. Firing them in
 * parallel would work but takes the per-file progress away — `pendingNames`
 * is what the panel draws its optimistic rows from.
 *
 * A rejected file does not abandon the rest of the drop: each failure is
 * toasted by name, and whatever succeeded is still committed. Losing a file
 * silently is worse than losing it loudly.
 */
export function useUploadNoteDocument(
  noteId: string,
  messages?: UseUploadNoteDocumentMessages
) {
  const queryClient = useQueryClient();
  const [pendingNames, setPendingNames] = useState<string[]>([]);

  const describe = useCallback(
    (violation: DocumentValidationError) =>
      messages?.describeViolation?.(violation) ??
      describeDocumentViolation(violation),
    [messages]
  );

  const mutation = useMutation({
    mutationFn: async (files: File[]) => {
      const failures: string[] = [];
      let uploaded = 0;

      setPendingNames(files.map((file) => file.name));

      for (const file of files) {
        // Checked here as well as on the server: this answer costs no request
        // at all, and the server's copy is the guarantee rather than the
        // courtesy (the split `upload-constraints.ts` documents).
        const violation = findDocumentViolation(file);
        if (violation) {
          failures.push(describe(violation));
        } else {
          const formData = new FormData();
          formData.append('file', file);

          const res = await uploadNoteDocument(noteId, formData);
          if (res.success) {
            uploaded += 1;
          } else {
            failures.push(res.errorMsg);
          }
        }

        setPendingNames((names) => names.filter((name) => name !== file.name));
      }

      return { uploaded, failures };
    },
    onSettled: () => {
      // Cleared here rather than at the end of `mutationFn` so a thrown
      // request cannot leave optimistic rows on screen forever.
      setPendingNames([]);
    },
    onSuccess: ({ uploaded, failures }) => {
      if (uploaded > 0) {
        queryClient.invalidateQueries({
          queryKey: noteDocumentKeys.list(noteId),
        });
        toast(messages ? messages.added : 'Attachment added');
      }

      for (const failure of failures) {
        toast.error(messages ? messages.error : 'Could not attach the file', {
          description: failure,
        });
      }
    },
    onError: () =>
      toast.error(messages ? messages.error : 'Could not attach the file'),
  });

  const { mutateAsync } = mutation;

  const upload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      // Swallowed on purpose: every outcome is already a toast, and a
      // rejection here would surface as an unhandled promise in the drop
      // handler that called it.
      await mutateAsync(files).catch(() => undefined);
    },
    [mutateAsync]
  );

  return { upload, isPending: mutation.isPending, pendingNames };
}
