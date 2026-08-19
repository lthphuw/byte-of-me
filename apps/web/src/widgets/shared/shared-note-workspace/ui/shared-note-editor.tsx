'use client';

import { Button } from '@byte-of-me/ui';
import { fromEditorContent } from '@byte-of-me/ui/lib/rich-text-content';
import { useFormatter, useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/utils';
import { LazyRichTextEditor } from '@/shared/ui/lazy-rich-text-editor';
import { useSharedNoteAutosave } from '@/widgets/shared/shared-note-workspace/lib/use-shared-note-autosave';

/**
 * The editor half of a shared note, for a collaborator with EDIT access.
 *
 * NOT keyed on the note id by its parent any more. `initialContent` still
 * seeds the uncontrolled editor exactly once per document — feeding the
 * query's value back in on every render would fight the user's cursor, which
 * is the failure `use-note-editor-autosave` describes — but WHICH document
 * that is now changes with the props, through the hook's `seedGeneration`,
 * the way the owner's editor has always done it. The remount that used to
 * happen instead threw away the mutation state, the status line and the
 * conflict banner along with the note, and made the departure flush the only
 * thing standing between a sibling click and lost keystrokes.
 */
export function SharedNoteEditor({
  noteId,
  initialContent,
  initialUpdatedAt,
}: {
  noteId: string;
  initialContent: string;
  /** The server row `initialContent` came from. The save path sends it back
   *  as its concurrency base — see `useSharedNoteAutosave`. */
  initialUpdatedAt: Date;
}) {
  const t = useTranslations('share.note');
  const format = useFormatter();
  const {
    change,
    isSaving,
    isError,
    isSaved,
    retry,
    seedValue,
    seedGeneration,
    conflict,
    resolveConflict,
  } = useSharedNoteAutosave(noteId, initialContent, initialUpdatedAt);

  // Suppressed while the banner is up: autosave is suspended, so "Saving…"
  // would be a lie and "Not saved" would be a second, weaker telling of what
  // the banner already says in full.
  const status = conflict
    ? null
    : isError
    ? t('saveFailed')
    : isSaving
    ? t('saving')
    : isSaved
    ? t('saved')
    : null;

  return (
    <div className="flex flex-col gap-2">
      {/* Above the document rather than in a dialog, the same placement and
          the same two answers the owner's `NoteEditConflict` uses — the
          reader's own version is what is underneath, and being able to READ
          it is most of what makes the choice answerable. A modal would cover
          the evidence. */}
      {conflict ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{t('conflict.title')}</p>
            <p className="text-xs text-muted-foreground">
              {t('conflict.description', {
                serverAt: format.dateTime(conflict.serverUpdatedAt, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }),
                localAt: format.dateTime(conflict.localEditedAt, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }),
              })}
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => resolveConflict('keep-mine')}
            >
              {t('conflict.keepMine')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => resolveConflict('take-server')}
            >
              {t('conflict.takeServer')}
            </Button>
          </div>
        </div>
      ) : null}

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
            reader leaves this surface, and nothing re-fires a failed save on
            its own — the buffer has not changed since, so no debounce is
            coming. The toast `useSharedNoteAutosave` raises is what survives
            the departure; this is what makes the failure actionable while the
            reader is still here. */}
        {isError && !conflict ? (
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
        // The editor reads `value` once, on mount, so a remount is the only
        // way to show a document it was not seeded with — and this surface
        // reseeds for two reasons: a sibling opening in this same component,
        // and the reader accepting somebody else's version.
        //
        // `seedGeneration` ALONE, not `${noteId}:${seedGeneration}` the way
        // `note-editor.tsx` writes it. That form was tried here and is wrong
        // without the owner editor's `isSeeded` gate in front of it: `noteId`
        // changes a render before the reseed effect runs, so the key moved
        // first and mounted a real Tiptap instance on the PREVIOUS note's
        // document under the new note's id, which the reseed then replaced —
        // two mounts and one frame of the wrong body. `seedGeneration` bumps
        // in the same call that sets `seedValue`, so it cannot describe a
        // document that is not there yet.
        key={seedGeneration}
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
