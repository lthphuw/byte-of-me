'use client';

import { useState } from 'react';
import { Button } from '@byte-of-me/ui';
import {
  fromEditorContent,
  toEditorContent,
} from '@byte-of-me/ui/lib/rich-text-content';
import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/utils';
import { LazyRichTextEditor } from '@/shared/ui/lazy-rich-text-editor';
import { useSharedNoteAutosave } from '@/widgets/shared/shared-note-workspace/lib/use-shared-note-autosave';

/**
 * The editor half of a shared note, for a collaborator with EDIT access.
 *
 * `initialContent` is read ONCE, into the uncontrolled editor: feeding the
 * query's value back in on every render would fight the user's cursor, which
 * is the failure `use-note-editor-autosave` describes. The workspace keys this
 * element on the note id, so opening a sibling REMOUNTS it — which is exactly
 * why every durability guarantee on this surface lives in
 * `useSharedNoteAutosave`'s departure flush rather than in a later render.
 */
export function SharedNoteEditor({
  noteId,
  initialContent,
}: {
  noteId: string;
  initialContent: string;
}) {
  const t = useTranslations('share.note');
  // Parsed once, beside the mount that reads it. `toEditorContent`, not
  // `JSON.parse`: a note stored before the editor existed holds plain text,
  // which `JSON.parse` throws on and this turns into a paragraph.
  const [seedValue] = useState(() => toEditorContent(initialContent));
  const { change, isSaving, isError, isSaved, retry } = useSharedNoteAutosave(
    noteId,
    initialContent
  );

  const status = isError
    ? t('saveFailed')
    : isSaving
    ? t('saving')
    : isSaved
    ? t('saved')
    : null;

  return (
    <div className="flex flex-col gap-2">
      {/* Fixed height so the column does not jump the first time a status
          appears. */}
      <div className="flex h-6 items-center gap-2 text-xs">
        {status ? (
          <span
            className={cn(
              'text-muted-foreground',
              isError && 'text-destructive'
            )}
          >
            {status}
          </span>
        ) : null}

        {/* The inline line alone is not a report: it unmounts the moment the
            reader clicks a sibling note, and nothing re-fires a failed save on
            its own — the buffer has not changed since, so no debounce is
            coming. The toast `useSharedNoteAutosave` raises is what survives
            the departure; this is what makes the failure actionable while the
            reader is still here. */}
        {isError ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-6 shrink-0 px-2"
            onClick={retry}
          >
            {t('retrySave')}
          </Button>
        ) : null}
      </div>

      {/* `chromeless`: the same toolbar-free writing surface the owner's notes
          workspace uses. Formatting is not lost with it — StarterKit's input
          rules still turn `## `, `**bold**` and friends into real nodes. */}
      <LazyRichTextEditor
        value={seedValue}
        onChange={(json, meta) => {
          // `meta.initial` marks the document the EDITOR produced while
          // opening this one — heading ids, parse-time attribute defaults —
          // not something the reader did. Taking it would arm the debounce on
          // every open and write a note back over itself for a change nobody
          // made, bumping the OWNER's `updatedAt` and rebuilding their link
          // graph. `note-editor.tsx` drops it for the same reason; this
          // surface used to ignore the flag entirely.
          if (meta.initial) return;
          change(fromEditorContent(json));
        }}
        chromeless
        compact
      />
    </div>
  );
}
