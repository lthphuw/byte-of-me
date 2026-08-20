'use client';

import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  documentFilesFrom,
  type DocumentValidationError,
  useUploadNoteDocument,
} from '@/entities/note-document';

/**
 * "Attach whatever was just handed to us."
 *
 * Files reach a note from three places — dropped on the editor, dropped on the
 * Files panel, chosen through the panel's picker — and all three receive a
 * `FileList` that may hold anything at all. Splitting "this is an attachment"
 * from "this is not" in one place is what keeps the three surfaces from
 * disagreeing about the same drop.
 *
 * This is also where the entity's upload hook gets its language. That hook
 * lives in `entities/`, which may not decide that `dashboard.note.*` owns this
 * copy, so it takes pre-translated sentences and falls back to English
 * literals without them — English is exactly what a Vietnamese author would
 * have read on every successful attach if this feature had not passed them in.
 *
 * The IGNORED-file toast lives here rather than in that hook for the mirror
 * reason: the hook is handed the PDFs only, so by the time it runs the files
 * that were dropped on the floor are already gone. A mixed drop that swallows
 * the images silently is the one outcome this feature must not produce.
 */
export function useAttachDocuments(noteId: string) {
  const t = useTranslations('dashboard.note');

  // Memoized because the hook below derives a `useCallback` from this object;
  // a fresh literal every render would rebuild it every render.
  const messages = useMemo(
    () => ({
      added: t('toasts.attachmentAdded'),
      error: t('attachments.errors.upload'),
      describeViolation: (violation: DocumentValidationError) =>
        violation.kind === 'type'
          ? t('attachments.errors.type', { fileName: violation.fileName })
          : t('attachments.errors.size', {
              fileName: violation.fileName,
              maxSizeMb: violation.maxSizeMb,
            }),
    }),
    [t]
  );

  const { upload, isPending, pendingNames } = useUploadNoteDocument(
    noteId,
    messages
  );

  const attach = useCallback(
    (files: FileList | File[] | null | undefined) => {
      const documents = documentFilesFrom(files);

      // Reference equality, not names: `documentFilesFrom` FILTERS the list it
      // is given, so every accepted entry is the very same `File` object — and
      // two files dropped together can share a name.
      for (const file of Array.from(files ?? [])) {
        if (documents.includes(file)) continue;
        toast.error(t('toasts.attachmentIgnored', { fileName: file.name }));
      }

      if (documents.length === 0) return;

      // Sequential, one request per file — the entity's hook owns that, along
      // with the per-file success and failure toasts.
      void upload(documents);
    },
    [t, upload]
  );

  return { attach, isPending, pendingNames };
}
