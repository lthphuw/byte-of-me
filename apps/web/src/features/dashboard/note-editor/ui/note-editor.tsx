'use client';

import { useRef, useState } from 'react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@byte-of-me/ui';
import {
  fromEditorContent,
} from '@byte-of-me/ui/lib/rich-text-content';
import type {
  OutlineItem,
  RichTextEditorApi,
} from '@byte-of-me/ui/rich-text-editor';
import { ChevronLeft, CircleHelp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { createScopedImageUploader } from '@/entities/media';
import { parseNoteHref } from '@/entities/note';
import { useNoteEditorAutosave } from '@/features/dashboard/note-editor/lib/use-note-editor-autosave';
import { NoteEditorSkeleton } from '@/features/dashboard/note-editor/ui/note-editor-skeleton';
import { NoteExportMenu } from '@/features/dashboard/note-editor/ui/note-export-menu';
import { Link } from '@/shared/i18n/navigation';
import { LazyRichTextEditor } from '@/shared/ui/lazy-rich-text-editor';

/** Images pasted into this editor land under the `note` prefix in storage. */
const uploadImage = createScopedImageUploader('note');


export interface NoteEditorProps {
  noteId: string;
  /**
   * The note list. Rendered as a back arrow below `md`, where the list and
   * the editor are two screens rather than two panes — on a desktop the tree
   * is already on screen and the arrow would point at nothing.
   */
  backHref?: string;
  /** Archive/delete menu, passed in by the widget: both are features, and a
   *  feature importing a sibling feature is a sideways import. */
  actions?: React.ReactNode;
  /** Opens another note — used by the `[[` links inside the document. */
  onOpenNote?: (noteId: string) => void;
  /** Fired when the author types `[[`; the widget owns the note picker. */
  onLinkTrigger?: (
    insertLink: (link: { text: string; href: string }) => void
  ) => void;
  /** The properties panel, passed in by the widget for the same sideways-
   *  import reason as `actions`: `note-properties` is a sibling feature. */
  propertiesSlot?: React.ReactNode;
  /** Opens the markdown cheat-sheet. The DIALOG belongs to the widget (the
   *  command palette must reach it with no note open); this only asks. */
  onOpenCheatSheet?: () => void;
  /** The heading outline, re-reported as it changes — the widget's ToC tab
   *  renders from it. Pass-through to the shared editor. */
  onOutlineChange?: (items: OutlineItem[]) => void;
  /** The note's folder path, drawn above the title. A slot, like the two
   *  above: resolving ancestors is a query and the widget owns queries. */
  breadcrumbSlot?: React.ReactNode;
}

export function NoteEditor({
  noteId,
  backHref,
  actions,
  onOpenNote,
  onLinkTrigger,
  propertiesSlot,
  onOpenCheatSheet,
  onOutlineChange,
  breadcrumbSlot,
}: NoteEditorProps) {
  const t = useTranslations('dashboard.note');
  // Raw markdown source vs WYSIWYG. Resets on note switch for free: the
  // widget mounts this component with `key={noteId}`.
  const [rawMode, setRawMode] = useState(false);
  // The live editor's serializers, published by `onEditorApi` below. Null
  // until Tiptap has mounted, and null again once it unmounts — the export
  // menu treats both as "not ready" rather than crashing.
  const editorApiRef = useRef<RichTextEditorApi | null>(null);
  const {
    note,
    isPending,
    isError,
    isSeeded,
    title,
    setTitle,
    setContent,
    seedGeneration,
    seedValue,
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
    // A skeleton in the shape of the editor, not a line of text in the corner.
    // The text version told the author nothing about what was arriving and
    // moved the whole layout when it did.
    return <NoteEditorSkeleton />;
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

  // A folder has no document, so it must never reach the editor. Nothing in
  // the UI routes one here — tree rows toggle instead of opening, `searchNotes`
  // filters `isFolder: false`, `useCreateNote` skips `onCreated` for folders,
  // and the graph and the hub's recents both exclude them — but
  // `/space/notes/<folderId>` is still a URL that can be typed or bookmarked,
  // and mounting on one meant the first keystroke wrote `content` and
  // `plainText` onto a folder row and had `updateNote` rebuild its links from
  // a document it should never have carried.
  //
  // Safe to gate AFTER `useNoteEditorAutosave`: the seed makes `lastSentRef`
  // equal to the buffer, and with nothing on screen to type into, the autosave
  // effect never sees a divergence to send.
  if (note.isFolder) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {t('folderNotEditable')}
      </div>
    );
  }

  return (
    // No page padding of its own, and no `gap`: the header, the title and the
    // writing surface each own their spacing. The previous `p-6` charged 48px
    // of vertical space on a phone before a single word was visible, on top of
    // the two stacked bars the old layout put above it.
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        {backHref && (
          <Button
            asChild
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
          >
            <Link href={backHref} aria-label={t('backToList')}>
              <ChevronLeft className="size-5" />
            </Link>
          </Button>
        )}

        {/* The save status moved up here from the foot of the editor: down
            there it was one more row competing with the writing surface for
            the little height a phone has, and it was below the fold as soon
            as the document got long. */}
        <div className="min-w-0 flex-1 px-1">
          {isSaveError ? (
            // Persistent, not the transient toast the mutation's `onError`
            // also shows: `save.isPending` returning to `false` after a
            // failure must not read as "Saved" — nothing changed on the
            // server, and nothing else re-fires the save automatically (the
            // buffer is unchanged since the failed attempt, which is exactly
            // what the autosave effect treats as "nothing new to send"), so
            // the only way back is this explicit retry.
            <p
              className="flex items-center gap-2 text-xs text-destructive"
              aria-live="polite"
            >
              <span className="truncate">{t('status.error')}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 shrink-0 px-2"
                onClick={retry}
              >
                {t('status.retry')}
              </Button>
            </p>
          ) : (
            <p className="truncate text-xs text-muted-foreground" aria-live="polite">
              {isSaving ? t('status.saving') : t('status.saved')}
            </p>
          )}
        </div>

        {/* Editor ⇄ raw-markdown view. A segmented pair rather than one
            mode-named button: the label always says where you ARE, so a
            toggle reading "Markdown" is ambiguous about which side it means. */}
        <div
          role="group"
          aria-label={t('view.label')}
          className="flex shrink-0 items-center gap-0.5 rounded-md border p-0.5"
        >
          <Button
            type="button"
            size="sm"
            variant={rawMode ? 'ghost' : 'secondary'}
            className="h-6 px-2 text-xs"
            aria-pressed={!rawMode}
            onClick={() => setRawMode(false)}
          >
            {t('view.editor')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={rawMode ? 'secondary' : 'ghost'}
            className="h-6 px-2 text-xs"
            aria-pressed={rawMode}
            onClick={() => setRawMode(true)}
          >
            {t('view.markdown')}
          </Button>
        </div>

        {onOpenCheatSheet && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  aria-label={t('cheatSheet.open')}
                  onClick={onOpenCheatSheet}
                >
                  <CircleHelp className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {t('cheatSheet.open')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <NoteExportMenu note={note} apiRef={editorApiRef} />

        {actions}
      </div>

      {/* The path this note sits at. Above the title rather than in the header
          bar: that bar is already four controls wide on a phone, and a
          breadcrumb belongs with the thing it names. Passed in as a slot for
          the usual reason — resolving a note's ancestors is a query, and the
          widget owns queries. */}
      {breadcrumbSlot}

      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={t('fields.titlePlaceholder')}
        aria-label={t('fields.title')}
        // `text-xl` below `md`: at `text-2xl` a two-line note title ate a
        // tenth of a phone screen on its own.
        className="w-full shrink-0 border-none bg-transparent px-4 pb-1 pt-3 text-xl font-semibold outline-none placeholder:text-muted-foreground md:px-6 md:pt-5 md:text-2xl"
      />

      {propertiesSlot}

      <div
        className="min-h-0 flex-1"
        // Capture phase, deliberately: `@tiptap/extension-link` binds its own
        // click handler on the editor's DOM node below this, and by default
        // that handler opens the href in a new tab. React attaches capture
        // listeners at the root, so this runs first and can claim the event
        // before ProseMirror sees it — turning a note link into an in-app
        // navigation instead of a second tab pointing at the same app.
        //
        // Only note links are claimed; an ordinary external link in a note
        // keeps whatever behaviour it has everywhere else.
        onClickCapture={(event) => {
          if (!onOpenNote) return;

          const target = event.target;
          if (!(target instanceof HTMLElement)) return;

          const anchor = target.closest('a[href]');
          if (!anchor) return;

          // `getAttribute`, not `.href`: the property is resolved against the
          // page's origin, so a relative note path arrives as a full URL and
          // the pattern would never match it.
          const linkedNoteId = parseNoteHref(anchor.getAttribute('href') ?? '');
          if (!linkedNoteId) return;

          event.preventDefault();
          event.stopPropagation();
          onOpenNote(linkedNoteId);
        }}
      >
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

            `value` is `seedValue` — the hook's own parsed copy of the buffer
            it seeded, produced in the same effect call that bumps
            `seedGeneration`, so by the render this key actually changes in it
            has ALREADY been updated to match. That is the same guarantee the
            previous `toEditorContent(content)` had (and for the same reason);
            what it drops is re-deriving it on every OTHER render. Measured:
            that inline call re-parsed the whole document on every keystroke —
            0.07ms at 21KB, 0.27ms at 83KB, 1.08ms at 334KB — for a prop
            `RichTextEditor` reads exactly once, on mount. */}
        <LazyRichTextEditor
          key={`${note.id}:${seedGeneration}`}
          value={seedValue}
          // No toolbar, unlike every other editor in this dashboard: a note is
          // composed in markdown — StarterKit's input rules turn `## `,
          // `**bold**`, `- ` and `> ` into real nodes as they are typed — so the
          // bar is chrome the author never reaches for. Selecting text still
          // raises the bubble bar for the things markdown cannot express.
          chromeless
          // Notes are the workspace where formulas live; `$…$` and `$$…$$`
          // render as KaTeX while typing. Other editors keep `$` literal.
          withMath
          markdownMode={rawMode}
          onOutlineChange={onOutlineChange}
          // The markdown serializer, for `.md` export. Stored on a ref rather
          // than in state: nothing renders differently once it arrives, and a
          // setState here would re-render the editor's whole parent on mount.
          onEditorApi={(api) => {
            editorApiRef.current = api;
          }}
          // Take the height this pane gives, instead of the editor's own
          // `h-[min(720px,62dvh)]`. That fixed box was nested inside this
          // already-scrolling pane, so a phone scrolled a ~60dvh window
          // inside a full-height column — two scrollbars, and a writing area
          // a fraction of the screen it was supposedly filling.
          fill
          // `[[` opens the note picker the widget owns. Notes are the only
          // surface that passes this, so `[[` stays two literal brackets in
          // every other editor in the dashboard.
          onLinkTrigger={onLinkTrigger}
          // Turns on drag-a-file and paste-a-screenshot: the editor uploads it
          // and inserts it where it landed. Without this prop the handlers
          // decline the event and the browser navigates away to the image.
          uploadImage={uploadImage}
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
    </div>
  );
}
