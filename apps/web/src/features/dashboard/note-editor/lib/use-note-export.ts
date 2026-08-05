'use client';

import { useCallback } from 'react';
import type { RichTextEditorApi } from '@byte-of-me/ui/rich-text-editor';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import type { NoteDetail } from '@/entities/note';
import {
  buildMarkdownFile,
  noteFileName,
} from '@/features/dashboard/note-editor/lib/note-frontmatter';

/**
 * Where the print view lives.
 *
 * Outside `/space` on purpose: `space/layout.tsx` renders the nav rail and
 * `space/notes/layout.tsx` renders the whole workspace, and a page whose
 * entire job is to become a clean PDF must inherit neither.
 */
export const NOTE_PRINT_PATH = '/print/notes';

/**
 * The two export paths from the editor header.
 *
 * Both need the note metadata; only markdown needs the live editor, because
 * only markdown has to serialize the document the author is looking at right
 * now rather than the copy the server last saw.
 */
export function useNoteExport(
  note: NoteDetail | undefined,
  apiRef: React.RefObject<RichTextEditorApi | null>
) {
  const t = useTranslations('dashboard.note');

  const exportMarkdown = useCallback(() => {
    const api = apiRef.current;
    if (!note || !api) {
      toast.error(t('export.notReady'));
      return;
    }

    const file = buildMarkdownFile(note, api.getMarkdown());
    // A Blob URL, not a `data:` URL — a long note exceeds what some browsers
    // accept in a `data:` href, and the revoke below bounds the memory rather
    // than leaking one buffer per export for the life of the tab.
    const url = URL.createObjectURL(
      new Blob([file], { type: 'text/markdown;charset=utf-8' })
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = noteFileName(note.title);
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [note, apiRef, t]);

  const openPrintView = useCallback(() => {
    if (!note) {
      toast.error(t('export.notReady'));
      return;
    }
    // A real navigation in a new tab, not an iframe: Chrome's print preview
    // is what turns this into a text-true PDF, and it needs a document of its
    // own with the print stylesheet applied. `noopener` because the opened
    // page gets no business with this one.
    //
    // `?print=1` is what makes the new tab open its print dialog by itself.
    // The page does NOT do that unprompted — see `NotePrintTrigger`.
    window.open(`${NOTE_PRINT_PATH}/${note.id}?print=1`, '_blank', 'noopener');
  }, [note, t]);

  return { exportMarkdown, openPrintView };
}
