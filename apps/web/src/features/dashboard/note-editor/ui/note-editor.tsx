'use client';

import { Button } from '@byte-of-me/ui';
import {
  fromEditorContent,
  toEditorContent,
} from '@byte-of-me/ui/lib/rich-text-content';
import { useTranslations } from 'next-intl';

import { uploadSingleMedia } from '@/entities/media';
import { useNoteEditorAutosave } from '@/features/dashboard/note-editor/lib/use-note-editor-autosave';
import { LazyRichTextEditor } from '@/shared/ui/lazy-rich-text-editor';

export interface NoteEditorProps {
  noteId: string;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const t = useTranslations('dashboard.note');
  const {
    note,
    isPending,
    isError,
    isSeeded,
    title,
    setTitle,
    content,
    setContent,
    seedGeneration,
    isSaving,
    isSaveError,
    retry,
  } = useNoteEditorAutosave(noteId);

  // Error is checked FIRST, before the loading gate below, deliberately:
  // `isSeeded` can NEVER become true after a load failure — the seed effect
  // it comes from early-returns on `!note`, and `note` never resolves once
  // `getAdminNoteById` has failed — so a query ordered `isPending ||
  // !isSeeded` THEN `isError` would show the loading copy forever instead
  // of `errors.load`. That is exactly what shipped for one round: `isSeeded`
  // was added to close the C1 regression below and inserted ahead of the
  // pre-existing error check without anyone re-deriving which branch a
  // failure actually falls into.
  if (isError) {
    return (
      <div className="p-6 text-sm text-destructive">{t('errors.load')}</div>
    );
  }

  // `isSeeded` gets the SAME treatment as `isPending`, not just a truthiness
  // check further down: the render where `note` first resolves (or switches
  // notes) has `isSeeded` false for exactly that one render, and the editor
  // below is keyed on `seedGeneration` — which has not bumped yet in that
  // same render either. Rendering the editor anyway would mount it from the
  // pre-seed `content` (`''`, or the previous note's body) under the
  // OLD key, and that mount is real (the stub records it; a real Tiptap
  // instance would too) even though `seedGeneration` bumping one render
  // later immediately replaces it — which is exactly the C1 bug this
  // component's `key` was first written to prevent, reopened by seeding the
  // editor from the local buffer instead of `note.content` directly (needed
  // so a same-note reseed — I2 — has something to remount to; see the
  // editor's own comment below).
  if (isPending || !isSeeded) {
    return (
      <div className="p-6 text-sm text-muted-foreground">{t('loading')}</div>
    );
  }

  // Defensive, not reachable in practice: `isPending`/`isError`/`isSeeded`
  // above already exhaust the states `useQuery` and the seed effect produce
  // for a successful load, but `note` stays in the return type as
  // `NoteDetail | undefined` rather than narrowed, so this keeps the
  // compiler (and a future refactor) honest about that.
  if (!note) {
    return (
      <div className="p-6 text-sm text-destructive">{t('errors.load')}</div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={t('fields.titlePlaceholder')}
        aria-label={t('fields.title')}
        className="w-full border-none bg-transparent text-2xl font-semibold outline-none placeholder:text-muted-foreground"
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Keyed on `note.id` AND `seedGeneration`, not `note.id` alone:
            `RichTextEditor` reads `value` only once, to seed Tiptap on
            mount, and never syncs later prop changes into the live
            document — so the ONLY way to make it show a value the hook
            re-seeds is to force a remount, and `note.id` alone only changes
            on a note switch. `useNoteEditorAutosave` also re-seeds `content`
            on the SAME note, once a save that was in flight during a switch
            away and back finally lands (see its own long comment) — without
            `seedGeneration` in this key, that catch-up would update the
            hook's `content` buffer while this editor kept showing whatever
            document it already had, silently splitting the two with nothing
            on screen indicating they disagree.

            `value` is seeded from `content` (the hook's buffer), not
            `note.content` directly: `seedGeneration` only bumps in the same
            effect call that seeds `content`, so by the render this key
            actually changes in, `content` has ALREADY been updated to match
            — no lag, unlike reading `note.content` independently, which
            would depend on `note` itself not having moved on since. */}
        <LazyRichTextEditor
          key={`${note.id}:${seedGeneration}`}
          value={toEditorContent(content)}
          // No toolbar, unlike every other editor in this dashboard: a note is
          // composed in markdown — StarterKit's input rules turn `## `,
          // `**bold**`, `- ` and `> ` into real nodes as they are typed — so the
          // bar is chrome the author never reaches for. Selecting text still
          // raises the bubble bar for the things markdown cannot express.
          chromeless
          // Turns on drag-a-file and paste-a-screenshot: the editor uploads it
          // and inserts it where it landed. Without this prop the handlers
          // decline the event and the browser navigates away to the image.
          uploadImage={uploadSingleMedia}
          onChange={(json, meta) => {
            // `meta.initial` marks the document the EDITOR produced while
            // opening this one — heading ids the table-of-contents extension
            // assigns, parse-time attribute defaults — not something the
            // author did. See `RichTextChangeMeta` in
            // `packages/ui/src/rich-text-editor/tiptap/rich-text-editor.tsx`
            // for why the editor has to be the one to say so.
            //
            // Dropped entirely rather than folded into the buffer: this is an
            // autosave, and a note that was merely OPENED must produce no
            // write at all. Taking it would make `content` diverge from
            // `lastSentRef` for a change nobody made, and one debounce later
            // the whole document goes back to the server over itself —
            // exactly the bug this line exists to close (every open bumping
            // `updatedAt`, plus a red toast from the blank-title save that
            // used to precede it).
            //
            // The visible document and the buffer do briefly disagree
            // afterwards (the editor holds the heading ids, the buffer does
            // not), which is safe in a way the `seedGeneration` reseed the
            // editor is keyed on is not: nothing here reseeds or remounts, so
            // the editor keeps showing the author's own text, and the first
            // real edit reports the full normalised document and reconciles
            // the two. What must never happen is the reverse — the buffer
            // moving without the editor — which is what that key guards.
            if (meta.initial) return;
            setContent(fromEditorContent(json));
          }}
        />
      </div>

      {isSaveError ? (
        // Persistent, not the transient toast the mutation's `onError` also
        // shows: `save.isPending` returning to `false` after a failure must
        // not read as "Saved" — nothing changed on the server, and nothing
        // else re-fires the save automatically (the buffer is unchanged
        // since the failed attempt, which is exactly what the autosave
        // effect treats as "nothing new to send"), so the only way back is
        // this explicit retry.
        <p
          className="flex items-center gap-2 text-xs text-destructive"
          aria-live="polite"
        >
          {t('status.error')}
          <Button type="button" size="sm" variant="outline" onClick={retry}>
            {t('status.retry')}
          </Button>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {isSaving ? t('status.saving') : t('status.saved')}
        </p>
      )}
    </div>
  );
}
