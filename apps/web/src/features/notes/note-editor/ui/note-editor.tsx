'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { ChevronLeft, CircleHelp, Sparkles } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { parseNoteHref } from '@/entities/note';
import { uploadNoteImage } from '@/entities/note-document';
import { useWorkspaceSettings } from '@/entities/workspace-settings';
import { useNoteEditorAutosave } from '@/features/notes/note-editor/lib/use-note-editor-autosave';
import { NoteEditorSkeleton } from '@/features/notes/note-editor/ui/note-editor-skeleton';
import { NoteExportMenu } from '@/features/notes/note-editor/ui/note-export-menu';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import { LazyRichTextEditor } from '@/shared/ui/lazy-rich-text-editor';

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
  /**
   * The live editor's imperative API, republished as it comes and goes.
   *
   * The widget needs it to drop a link into the document when a file is
   * dropped on the writing surface: `note-attachments` is a sibling feature,
   * so the drop zone wraps this component from outside and has no way to reach
   * the editor on its own. Null on unmount, so a stale handle cannot be
   * called against a document that is gone.
   */
  onEditorApiChange?: (api: RichTextEditorApi | null) => void;
  /** The heading outline, re-reported as it changes — the widget's ToC tab
   *  renders from it. Pass-through to the shared editor. */
  onOutlineChange?: (items: OutlineItem[]) => void;
  /** The note's folder path, drawn above the title. A slot, like the two
   *  above: resolving ancestors is a query and the widget owns queries. */
  breadcrumbSlot?: React.ReactNode;
  /**
   * The title stopped changing, and it is not what it was when this note
   * opened. What the widget hangs the inbound-link relabel on.
   *
   * Reported on BLUR rather than on every save, and that is the whole design.
   * The title field autosaves as it is typed, so a per-save trigger would
   * rewrite every other note's link labels to `Kiế`, then `Kiến`, then
   * `Kiến t` — one fan-out across the vault per keystroke pause. Leaving the
   * field is the one moment the author has finished naming the thing.
   *
   * A callback rather than a direct call because the relabel lives in
   * `note-actions`, a sibling feature: the same sideways-import rule that puts
   * `actions` and `propertiesSlot` above in the widget's hands.
   */
  onTitleCommitted?: (previousTitle: string, nextTitle: string) => void;
}

export function NoteEditor({
  noteId,
  backHref,
  actions,
  onOpenNote,
  onLinkTrigger,
  propertiesSlot,
  onOpenCheatSheet,
  onEditorApiChange,
  onOutlineChange,
  breadcrumbSlot,
  onTitleCommitted,
}: NoteEditorProps) {
  const t = useTranslations('dashboard.note');
  // Raw markdown source vs WYSIWYG. Resets on note switch for free: the
  // widget mounts this component with `key={noteId}`.
  const [rawMode, setRawMode] = useState(false);
  // The live editor's serializers, published by `onEditorApi` below. Null
  // until Tiptap has mounted, and null again once it unmounts — the export
  // menu treats both as "not ready" rather than crashing.
  const editorApiRef = useRef<RichTextEditorApi | null>(null);
  const { settings } = useWorkspaceSettings();

  /**
   * Where a pasted or dropped image goes, and it is per-NOTE — which is why
   * this cannot be the module constant it used to be.
   *
   * It used to be `createScopedImageUploader('note')`, which writes to the
   * media library's PUBLIC bucket and returns a public URL. Measured: a `GET`
   * of one of those objects with no credentials answers 200. Every screenshot
   * ever pasted into a private note was readable by anyone holding its URL.
   * Now the bytes go to the private bucket as an INLINE `NoteDocument` and
   * what lands in the document is an app route, which checks the session.
   *
   * Throwing is the contract `ImageUploadFn` expects; the editor turns the
   * message into a toast naming the file.
   */
  const uploadImage = useCallback(
    async (file: File) => {
      const body = new FormData();
      body.append('file', file);

      const res = await uploadNoteImage(noteId, body);
      if (!res?.success || !res.data) {
        throw new Error(res?.errorMsg || 'Upload failed');
      }

      return res.data;
    },
    [noteId]
  );
  /**
   * The title as it stood the last time anyone was told about it — the note's
   * name on open, and then whatever the previous blur reported.
   *
   * Not derived from `note.title`: that field follows the autosave, so by the
   * time the author leaves the input the server copy already holds the NEW
   * name and the old one is gone. The relabel is defined entirely in terms of
   * the old one, so it has to be remembered here.
   *
   * A ref rather than state because nothing renders from it, and it must not
   * reset on the re-render the title save causes. It survives a note switch
   * for free: the widget mounts this component with `key={noteId}`.
   */
  const committedTitleRef = useRef<string | null>(null);
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
    conflict,
    resolveConflict,
  } = useNoteEditorAutosave(noteId);
  const format = useFormatter();

  // Seeded once, from the first resolved read. `note` is undefined while the
  // query is pending, and the component returns a skeleton for those renders —
  // so this cannot go in the render body above without running before there is
  // anything to record.
  useEffect(() => {
    if (committedTitleRef.current === null && note) {
      committedTitleRef.current = note.title;
    }
  }, [note]);

  // Error is checked FIRST, before the loading gate below, deliberately:
  // `isSeeded` can NEVER become true after a load failure — the seed effect
  // it comes from early-returns on `!note`, and `note` never resolves once
  // `getAdminNoteById` has failed — so a query ordered `isPending ||
  // !isSeeded` THEN `isError` would show the loading copy forever instead
  // of `errors.load`. That is exactly what shipped for one round: `isSeeded`
  // was added to close the C1 regression below and inserted ahead of the
  // pre-existing error check without anyone re-deriving which branch a
  // failure actually falls into.
  //
  // `&& !note` is what narrows this to a load that produced NOTHING. In
  // TanStack v5 a BACKGROUND REFETCH failure flips `status` to `'error'`
  // while `data` is still present — a window-focus refetch on a flaky
  // connection is enough — and this branch used to tear the whole editor
  // down for it. That is not merely a wrong message: unmounting destroys the
  // Tiptap instance, so the next successful refetch mounts a fresh one from
  // the seed, which loses the caret, resets the scroll position to the top
  // and drops the undo history. Same visible symptom as the reseed race
  // `inFlightRef` closes in the hook, reached through a different door. With
  // data in hand the honest answer is to keep editing what is on screen and
  // say the refresh failed, which the status line below now does.
  if (isError && !note) {
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
        {/* ONE live region, always mounted. It used to be two elements swapped
            on `isSaveError`, which meant the error region was INSERTED into the
            DOM at the moment it had something to say — NVDA and JAWS only
            announce changes inside a region that was already there, so the one
            message that mattered was the one never spoken. The surviving region
            had the opposite problem: it read "Saving…" then "Saved" on every
            debounce, talking over the author mid-sentence.
            So the visible text and the announced text are separated: the eye
            gets all three states, the screen reader only the transitions worth
            interrupting for — settled, or failed. */}
        {/* A failed background REFETCH is reported here rather than by
            replacing the editor with `errors.load` — see the `isError && !note`
            gate above for why unmounting a live document over a flaky refresh
            is the wrong trade. It goes through this SAME already-mounted
            region for the reason stated just above: a live region that is
            inserted at the moment it has something to say is the one message
            NVDA and JAWS never speak. Ranked below `isSaveError` because that
            state has an action attached (the retry button beside it) while
            this one only says the copy on screen may be behind. */}
        <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
          <p
            role="status"
            aria-live="polite"
            className={cn(
              'min-w-0 truncate text-xs',
              isSaveError || isError
                ? 'text-destructive'
                : 'text-muted-foreground'
            )}
          >
            <span aria-hidden="true">
              {isSaveError
                ? t('status.error')
                : isError
                  ? t('errors.load')
                  : isSaving
                    ? t('status.saving')
                    : t('status.saved')}
            </span>
            <span className="sr-only">
              {isSaveError
                ? t('status.error')
                : isError
                  ? t('errors.load')
                  : isSaving
                    ? ''
                    : t('status.saved')}
            </span>
          </p>

          {/* Persistent, not the transient toast the mutation's `onError`
              also shows: `save.isPending` returning to `false` after a
              failure must not read as "Saved" — nothing changed on the
              server, and nothing else re-fires the save automatically (the
              buffer is unchanged since the failed attempt, which is exactly
              what the autosave effect treats as "nothing new to send"), so
              the only way back is this explicit retry.

              Outside the status element rather than inside it: a button in a
              live region is read out as part of the announcement. */}
          {isSaveError && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 shrink-0 px-2"
              onClick={retry}
            >
              {t('status.retry')}
            </Button>
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

        {/* Tidies the raw source: whitespace, tabs, blank-line runs, list
            markers, heading spacing, table padding.

            Only rendered in markdown mode, and only ever run on demand. The
            editor's OWN serializer already emits close-to-canonical markdown,
            so there is nothing here to fix on the way in — what needs tidying
            is text the author pasted from somewhere else, and only they know
            when that happened. Running it automatically would also fight the
            caret: reformatting under someone mid-sentence is how a formatter
            becomes the thing you turn off. */}
        {rawMode && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  aria-label={t('markdown.format')}
                  onClick={() => {
                    const result = editorApiRef.current?.formatMarkdown();
                    // `unchanged` is a real answer, not a failure: the
                    // formatter is idempotent, so "already tidy" is worth
                    // saying rather than leaving the click looking dead.
                    if (result === 'formatted') {
                      toast.success(t('markdown.formatted'));
                    } else if (result === 'unchanged') {
                      toast.info(t('markdown.alreadyClean'));
                    }
                  }}
                >
                  <Sparkles className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {t('markdown.format')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

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
      {/* Two versions of this note that cannot both survive. Placed under the
          header rather than in a dialog on purpose: the document underneath is
          the author's own unsent version, and being able to READ it is most of
          what makes the choice answerable. A modal would cover the evidence.
          Autosave stays suspended while this is up — see the hook. */}
      {conflict && (
        <div
          role="alert"
          className="flex shrink-0 flex-col gap-2 border-b border-amber-500/40 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{t('conflict.title')}</p>
            <p className="text-xs text-muted-foreground">
              {t('conflict.description', {
                serverAt: format.dateTime(conflict.serverUpdatedAt, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }),
                localAt: format.dateTime(conflict.localSavedAt, {
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
      )}

      {breadcrumbSlot}

      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        // Leaving the field is what counts as "you have finished naming this",
        // and it is the only trigger — see `onTitleCommitted`'s doc comment for
        // why a per-save one would fan out across the vault once per keystroke
        // pause.
        //
        // The relabel deliberately does NOT wait for the title's own save to
        // land. It rewrites other notes' anchor text from the two strings it is
        // handed, so it does not depend on the rename having been stored; and
        // making it wait would mean holding the author's blur behind a network
        // round trip for a tidy-up that is supposed to be invisible. If that
        // save then fails, the editor already says so persistently and offers a
        // retry — the labels are momentarily ahead of the title, not lost.
        onBlur={() => {
          const previous = committedTitleRef.current;
          if (previous === null) return;

          const next = title.trim();
          if (!next || next === previous) return;

          committedTitleRef.current = next;
          onTitleCommitted?.(previous, next);
        }}
        placeholder={t('fields.titlePlaceholder')}
        aria-label={t('fields.title')}
        // `text-xl` below `md`: at `text-2xl` a two-line note title ate a
        // tenth of a phone screen on its own.
        className="w-full shrink-0 border-none bg-transparent px-4 pb-1 pt-3 text-xl font-semibold outline-none placeholder:text-muted-foreground md:px-6 md:pt-5 md:text-2xl"
      />

      {propertiesSlot}

      <div
        className="min-h-0 flex-1"
        // The three appearance settings, applied as data attributes on an
        // ANCESTOR rather than as props.
        //
        // `editor-surface.css` writes its variants as descendant selectors
        // (`[data-editor-density='compact'] .ProseMirror`), so any ancestor
        // works — which means the whole appearance group costs three attributes
        // here and nothing at all inside `packages/ui`. That package has no
        // business knowing this app has a settings table.
        //
        // The default of each is expressed as NO attribute, not as an explicit
        // value: the unset state is what the base rules already describe, and
        // an explicit `data-editor-density="comfortable"` would need a matching
        // CSS rule that exists only to undo the one above it.
        data-editor-density={
          settings.density === 'compact' ? 'compact' : undefined
        }
        data-editor-type={
          settings.typeScale === 'medium' ? undefined : settings.typeScale
        }
        data-editor-measure={settings.readableLineLength ? undefined : 'full'}
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
          spellCheck={settings.spellCheck}
          // The automatic halves of the markdown clean-up. The manual button in
          // the header stays regardless — these only decide whether the same
          // tidy also runs at two moments where it cannot land under a live
          // caret: leaving the pane, and the instant a paste arrives.
          formatMarkdownOnExit={settings.formatMarkdownOnExit}
          formatMarkdownOnPaste={settings.formatMarkdownOnPaste}
          onOutlineChange={onOutlineChange}
          // The markdown serializer, for `.md` export. Stored on a ref rather
          // than in state: nothing renders differently once it arrives, and a
          // setState here would re-render the editor's whole parent on mount.
          onEditorApi={(api) => {
            editorApiRef.current = api;
            onEditorApiChange?.(api);
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
