'use client';

import type { CSSProperties } from 'react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Sheet,
  SheetContent,
  SheetTitle,
  useMediaQuery,
} from '@byte-of-me/ui';
import type { RichTextEditorApi } from '@byte-of-me/ui/rich-text-editor';
import { CircleHelp, Network, PanelLeftOpen, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { NoteEditorActions } from './note-editor-actions';
import { NoteSidebarTabs } from './note-sidebar-tabs';
import { NoteTreePanel } from './note-tree-panel';

import { NOTE_HREF_PREFIX, noteHref, type NoteTreeNode } from '@/entities/note';
import {
  noteDocumentHref,
  useNoteDocuments,
} from '@/entities/note-document';
import {
  NoteActionsMenu,
  NoteRowContextMenu,
  useCreateNote,
  useRelabelInboundLinks,
} from '@/features/notes/note-actions';
import {
  AttachmentDropZone,
  NoteDocumentViewer,
  revealAttachmentInDocument,
} from '@/features/notes/note-attachments';
import {
  MarkdownCheatSheetDialog,
  NoteBreadcrumb,
  NoteEditor,
  useNoteSyncQueue,
} from '@/features/notes/note-editor';
import { NotePropertiesPanel } from '@/features/notes/note-properties';
import { NoteSearchPalette } from '@/features/notes/note-search';
import { useResizablePanel } from '@/shared/hooks/use-resizable-panel';
import { useRouter } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import {
  type NoteEditorStore,
  useNoteEditor,
  useNoteEditorStore,
} from '@/widgets/notes/note-manager/lib/note-editor-store';
import {
  type NoteOutlineStore,
  useNoteOutline,
  useNoteOutlineStore,
} from '@/widgets/notes/note-manager/lib/note-outline-store';
import { useWorkspaceShortcuts } from '@/widgets/notes/note-manager/lib/use-workspace-shortcuts';

/**
 * Memoised at the point of use rather than inside `note-tree-panel.tsx`, so the
 * panel stays a plain component for anyone reading it.
 *
 * What this buys: dragging the explorer's edge re-renders THIS widget on every
 * pointer move, and so did every outline report before the store below. The
 * tree does not care about either, and re-rendering it means re-rendering every
 * row. It only helps while the props below stay referentially stable, which is
 * why the four callbacks it receives are `useCallback`ed.
 *
 * This does NOT touch the measured re-render cost `use-explorer-tree.ts`
 * documents — that is about rows re-rendering INSIDE the panel when the tree's
 * own state moves, which `React.memo` cannot help and which this does not
 * change.
 */
const MemoNoteTreePanel = memo(NoteTreePanel);

/**
 * Where a note lives. The same string `noteHref` builds for a `[[` link, so
 * the route and the links stored in documents cannot drift apart.
 */
export const NOTES_BASE_PATH = NOTE_HREF_PREFIX.replace(/\/$/, '');

/** What the editor hands back when the author picks a note to link to. */
type InsertLink = (link: { text: string; href: string }) => void;

export interface NoteManagerProps {
  /**
   * The open note *according to the route* — `null` on the list route itself.
   * Still the source of truth; just no longer the render input. Everything
   * below reads `openNoteId`, which lets a click draw the note before the
   * router has finished agreeing with it.
   */
  noteId: string | null;
  /**
   * The space navigation trigger, mounted in the list header on phones.
   * Passed in by the page rather than imported here: both are widgets, and a
   * widget importing another widget is the sideways import AGENTS §3 rules
   * out. The app layer is where two widgets get composed.
   */
  navSlot?: React.ReactNode;
}

/**
 * The notes workspace: explorer, editor and the right-hand panel.
 *
 * Composition. The three panes each own their own state; what lives here is
 * only what spans them — which note is open, how wide the explorer is, and the
 * two overlays (search palette, cheat sheet) either pane can ask for.
 */
export function NoteManager({
  noteId: routeNoteId,
  navSlot,
}: NoteManagerProps) {
  const t = useTranslations('dashboard.note');
  const router = useRouter();

  // The note actually on screen. It leads the route rather than following it:
  // `(protected)/layout.tsx` is `force-dynamic` and the `[id]` page runs a
  // `getNoteTitle` query for its `generateMetadata`, so a note-to-note
  // `router.push` measured ~990ms before the URL even changed and ~2s before
  // the body appeared on a local dev server. Drawing off the click and letting
  // the URL catch up moves that entire round trip off the critical path — the
  // router still commits, so `[[` links, reload and Back keep working.
  const [openNoteId, setOpenNoteId] = useState<string | null>(routeNoteId);
  // Re-sync during render, not in an effect: an effect would paint one frame of
  // the stale note first, which is the flicker this exists to remove. React
  // re-runs this component immediately on a render-phase `setState` — the
  // documented "adjusting state when a prop changes" pattern.
  //
  // The route moving is how EVERY non-click selection arrives: Back and
  // Forward, a reload, the `router.replace` after deleting the open note, and
  // the push this component made itself. All must win over an optimistic pick.
  const lastRouteNoteId = useRef(routeNoteId);
  if (lastRouteNoteId.current !== routeNoteId) {
    lastRouteNoteId.current = routeNoteId;
    setOpenNoteId(routeNoteId);
  }

  const [searchOpen, setSearchOpen] = useState(false);
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false);
  /**
   * The attachment being read, or null. Owned here rather than in the Files
   * panel because the reader is a COLUMN at `lg+` and a dialog below it —
   * neither of which the panel can mount without knowing the layout.
   *
   * Cleared when the note changes, in render like `openNoteId` above: an
   * effect would paint one frame of the previous note's PDF beside the new
   * note's text.
   */
  const [openDocumentId, setOpenDocumentId] = useState<string | null>(null);
  /**
   * The live editor's imperative API, so a file dropped on the writing surface
   * can leave a link behind in the text.
   *
   * A ref, not state: nothing renders differently when it arrives, and a
   * setState here would re-render the workspace every time an editor mounts.
   */
  const editorApiRef = useRef<RichTextEditorApi | null>(null);
  const lastDocumentNoteId = useRef(openNoteId);
  if (lastDocumentNoteId.current !== openNoteId) {
    lastDocumentNoteId.current = openNoteId;
    setOpenDocumentId(null);
  }
  const [showArchived, setShowArchived] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  /**
   * The links sheet is `lg:hidden`, but its OVERLAY and its scroll lock are
   * not: crossing the breakpoint with it open left a dimmed, unscrollable page
   * with an invisible focus trap on it and nothing visible to dismiss. Closing
   * it costs nothing — the same panel is a permanent column at that width.
   */
  const isLinksColumnVisible = useMediaQuery('(min-width: 1024px)');
  useEffect(() => {
    if (isLinksColumnVisible) setLinksOpen(false);
  }, [isLinksColumnVisible]);
  /**
   * Set by a breadcrumb click; the tree opens onto that folder.
   *
   * A one-shot REQUEST, cleared the moment the tree satisfies it — the same
   * shape (and for the same reason) as `revealTarget` in `note-tree-panel.tsx`.
   * It used to be left set forever, which turned the reveal into a standing
   * condition and, with the inline `onReveal` the panel used to pass, an
   * unbounded render loop between the reveal and the row that clears it. See
   * `onRevealFolder` in `note-tree-panel.tsx` for the full cycle and the
   * measurement.
   */
  const [revealFolderId, setRevealFolderId] = useState<string | null>(null);
  const onFolderRevealed = useCallback(() => setRevealFolderId(null), []);
  // The open note's heading outline — reported by the editor, rendered by the
  // sidebar's ToC tab. Cleared on note switch so a heading-less note never
  // shows the previous note's outline while its editor mounts.
  //
  // A store rather than `useState`, and that is a fix rather than a
  // preference: TipTap reports the outline on every `docChanged` transaction,
  // so as state here every keystroke re-rendered the tree, every row, both
  // palettes and the editor for a value only the Contents tab reads. See
  // `note-outline-store.ts`.
  const outlineStore = useNoteOutlineStore();
  // The live editor, for the sidebar's Cite tab. A store for the same reason
  // the outline is one — see `note-editor-store.ts`.
  const editorStore = useNoteEditorStore();
  useEffect(() => {
    outlineStore.set([]);
  }, [openNoteId, outlineStore]);
  // Non-null exactly while the `[[` picker is open. Holding the editor's own
  // insert callback here — rather than a boolean plus a reach back into the
  // editor — is what keeps `packages/ui` from having to know what a note is.
  const [insertLink, setInsertLink] = useState<InsertLink | null>(null);

  /**
   * The explorer pane's width, dragged and remembered.
   *
   * Its own storage key rather than a fourth field on `useExplorerPrefs`: the
   * two have different lifetimes and different failure modes, and a corrupt
   * width should not take the author's view mode down with it.
   */
  const sidebar = useResizablePanel({
    storageKey: 'byte-of-me:notes-sidebar',
    min: 200,
    max: 480,
    defaultWidth: 256,
  });

  /**
   * The reader's share of the editor column. `edge: 'end'` because it is
   * anchored on the RIGHT — its separator is on its left, so dragging right
   * has to narrow it.
   *
   * 320 is the floor for both halves: below that a PDF page is unreadable and
   * a line of prose is a column of syllables.
   */
  const viewerPane = useResizablePanel({
    storageKey: 'byte-of-me:notes-viewer',
    min: 320,
    max: 900,
    defaultWidth: 480,
    edge: 'end',
  });

  /**
   * Read here as well as in the Files panel so the reader can step between
   * attachments with nothing but itself on screen — below `lg` the panel is
   * not mounted at all. TanStack serves both from one cache entry.
   */
  const { data: documents } = useNoteDocuments(
    // Only while the reader is actually open. Fetching as soon as a note
    // opened cost every note switch a request whose result nothing rendered —
    // the Files panel keeps its own copy, on the same key, and Radix does not
    // mount an inactive tab's panel at all.
    openDocumentId ? openNoteId : null
  );
  const openDocument =
    openDocumentId &&
    // Until the list arrives there is nothing to contradict the id, so the
    // reader opens immediately rather than waiting a request. Once it HAS
    // arrived, an id missing from it means the attachment was deleted while
    // it was on screen, and the reader closes.
    (!documents || documents.some((d) => d.id === openDocumentId))
      ? openDocumentId
      : null;

  /**
   * Below `lg` the reader is a dialog rather than a column, and it is MOUNTED
   * conditionally rather than hidden by CSS: a dialog that is merely
   * `lg:hidden` still holds the scroll lock and the focus trap, which is the
   * bug the links sheet above already documents.
   */
  const isViewerColumnVisible = useMediaQuery('(min-width: 1024px)');

  /**
   * What a row in the Files panel does when it is clicked.
   *
   * Goes to the place in the TEXT, not to the reader — the panel is a table of
   * contents for the note's files, and clicking an entry means the same thing
   * it means in the Contents tab. Reading the file is the row menu's "open",
   * which sets `openDocumentId` directly.
   *
   * A file with no link in the document has nowhere to jump to, which is the
   * ordinary case for one added through the panel's own button. Then the
   * reader is the only sensible answer.
   */
  const revealDocument = useCallback((documentId: string) => {
    if (!revealAttachmentInDocument(noteDocumentHref(documentId))) {
      setOpenDocumentId(documentId);
    }
  }, []);

  const { setCollapsed, isCollapsed } = sidebar;
  useWorkspaceShortcuts({
    searchOpen,
    onOpenSearch: useCallback(() => setSearchOpen(true), []),
    onOpenCheatSheet: useCallback(() => setCheatSheetOpen(true), []),
    onToggleSidebar: useCallback(
      () => setCollapsed(!isCollapsed),
      [setCollapsed, isCollapsed]
    ),
  });

  // Selection is still the URL — three things depend on it: a `[[` link points
  // at `/space/notes/<id>` and has to resolve; the mobile master–detail below
  // wants the browser's own Back button; and a reload should reopen the note
  // the author was writing. `setOpenNoteId` is not a second source of truth, it
  // is the same answer arriving sooner.
  const openNote = useCallback(
    (id: string) => {
      setLinksOpen(false);
      setOpenNoteId(id);
      router.push(`${NOTES_BASE_PATH}/${id}`);
    },
    [router]
  );

  // Leaving the open note (delete, archive) is the same move in reverse.
  const closeNote = useCallback(() => {
    setOpenNoteId(null);
    router.replace(NOTES_BASE_PATH);
  }, [router]);

  /** Only the note currently open needs the route changed out from under it. */
  const onRowRemoved = useCallback(
    (removedId: string) => {
      if (removedId === openNoteId) closeNote();
    },
    [openNoteId, closeNote]
  );

  // The palette's "New note" — the same mutation the tree panel's `+` uses.
  const createFromPalette = useCreateNote(openNote);

  // The four callbacks below used to be inline arrows. They are hoisted for
  // one reason: `MemoNoteTreePanel` compares props, and a fresh closure on
  // every render makes that comparison always fail.
  const onToggleArchived = useCallback(
    () => setShowArchived((current) => !current),
    []
  );
  const onOpenSearch = useCallback(() => setSearchOpen(true), []);

  const renderRowActions = useCallback(
    (node: NoteTreeNode, startRename: (noteId: string) => void) => (
      <NoteActionsMenu
        noteId={node.id}
        title={node.title}
        isFolder={node.isFolder}
        isArchived={node.archivedAt !== null}
        isPinned={node.isPinned}
        onCreatedInside={openNote}
        onRename={startRename}
        onRemoved={onRowRemoved}
        // The ONLY caller that passes this. The row owns the tab stop (roving
        // tabindex), so the trigger inside it must stay out of the tab order —
        // and the editor header's copy of this menu must not, which is what
        // hardcoding it in the component cost.
        tabIndex={-1}
        // Always visible on touch, hover-revealed on desktop: a phone has
        // no hover state to reveal it with, and it is the ONLY way to the
        // menu there — long-press belongs to dragging. See
        // `NoteRowContextMenu`.
        className="opacity-100 transition-opacity md:opacity-0 md:focus-visible:opacity-100 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
      />
    ),
    [openNote, onRowRemoved]
  );

  const renderRowContextMenu = useCallback(
    (
      node: NoteTreeNode,
      row: React.ReactNode,
      startRename: (noteId: string) => void
    ) => (
      <NoteRowContextMenu
        noteId={node.id}
        title={node.title}
        isFolder={node.isFolder}
        isArchived={node.archivedAt !== null}
        isPinned={node.isPinned}
        onCreatedInside={openNote}
        onRename={startRename}
        onRemoved={onRowRemoved}
      >
        {row}
      </NoteRowContextMenu>
    ),
    [openNote, onRowRemoved]
  );

  // Resends anything the browser is still holding unsent edits for. Mounted
  // HERE, not in the editor: it has to survive a note switch and to run even
  // with no note open, which is exactly the case where the notes that failed
  // to save are the ones nobody is looking at. It is told which note is open
  // so it leaves that one to the editor's own autosave.
  useNoteSyncQueue(openNoteId);

  // Brings other notes' link LABELS back in step after a rename. Mounted at
  // the widget for the same reason the sync queue is: the two places a rename
  // can happen — a tree row and the editor's title field — are two different
  // features, and this is the layer that can reach both.
  const relabelInboundLinks = useRelabelInboundLinks();

  return (
    <div className="flex min-h-0 flex-1">
      {/* `/space` and `/space/graph` both name themselves; this screen had no
          `h1` at all, so its heading outline started at the tree's own labels
          and a screen reader's "what page am I on" had no answer. Visually
          hidden because the workspace is chrome-less by design — the title bar
          the eye uses is the browser tab. */}
      <h1 className="sr-only">{t('title')}</h1>

      {/* Master–detail, by CSS rather than by unmounting: below `md` exactly
          one of these two panes is on screen at a time, and which one is
          decided by the route. Both stay mounted so crossing the breakpoint —
          or opening and closing a note — never discards the tree query. */}
      <aside
        // The width is a CSS variable so the Tailwind class can stay in the
        // class list and stay breakpoint-scoped: below `md` this pane is the
        // whole screen and the dragged width means nothing.
        style={{ '--notes-sidebar-w': `${sidebar.width}px` } as CSSProperties}
        className={cn(
          'flex min-h-0 w-full shrink-0 flex-col border-r bg-background md:flex md:w-[var(--notes-sidebar-w)]',
          openNoteId && 'hidden',
          sidebar.isCollapsed && 'md:hidden'
        )}
      >
        <MemoNoteTreePanel
          activeId={openNoteId}
          includeArchived={showArchived}
          onToggleArchived={onToggleArchived}
          onSelect={openNote}
          onOpenSearch={onOpenSearch}
          navSlot={navSlot}
          revealFolderId={revealFolderId}
          onFolderRevealed={onFolderRevealed}
          // The tree's own Delete/Backspace archive needs this for the same
          // reason the row menus below do: archiving the note the editor is
          // showing has to close the editor. Without it the keyboard path left
          // the editor open on a note that had just left the tree, still
          // autosaving into it — `updateNote` does not refuse an archived row.
          onRemoved={onRowRemoved}
          renderActions={renderRowActions}
          renderContextMenu={renderRowContextMenu}
        />
      </aside>

      {/* The drag handle, between the two panes. Desktop only: below `md` the
          panes are two screens and there is no boundary to drag. Its own
          element rather than a border on the aside, because a 1px border is not
          a pointer target — this is 4px wide and lights up on hover.

          4px is a target for a mouse and for nothing else, so the `::after`
          widens what can be GRABBED without widening what is DRAWN: ±8px for a
          pointer, ±20px on a coarse one, which is the 44px an iPad in landscape
          needs. `pointer: coarse` rather than a breakpoint, because the
          question is what is doing the pointing, not how wide the screen is —
          a 1280px tablet and a 1280px laptop want different answers here.
          Hovering the pseudo-element still lights the strip, so the wider
          target announces itself. */}
      {!sidebar.isCollapsed && (
        <div
          {...sidebar.separatorProps}
          aria-label={t('explorer.resizeAriaLabel')}
          className="relative z-10 hidden w-1 shrink-0 cursor-col-resize bg-transparent transition-colors after:absolute after:inset-y-0 after:-left-2 after:-right-2 after:content-[''] hover:bg-primary/40 focus-visible:bg-primary/60 focus-visible:outline-none md:block [@media(pointer:coarse)]:after:-left-5 [@media(pointer:coarse)]:after:-right-5"
        />
      )}

      {/* Collapsed, the explorer leaves a rail behind rather than vanishing. A
          keyboard shortcut is not a way back for someone who collapsed the pane
          by accident, and with no note open there would otherwise be nothing on
          screen at all. */}
      {sidebar.isCollapsed && (
        <div className="hidden shrink-0 flex-col border-r bg-background p-1 md:flex">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('explorer.expandSidebar')}
            onClick={() => sidebar.setCollapsed(false)}
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        </div>
      )}

      <main
        className={cn(
          'flex min-h-0 min-w-0 flex-1 bg-background md:flex',
          !openNoteId && 'hidden'
        )}
      >
        {openNoteId ? (
          <AttachmentDropZone
            noteId={openNoteId}
            className="flex min-h-0 min-w-0 flex-1 flex-col"
            // A file dropped ON THE TEXT leaves a link in the text. Dropping
            // it on the Files panel does not — there the author pointed at a
            // list, not at a place in their document.
            //
            // A link rather than a node of its own: a link already serializes
            // to markdown, prints, and renders on the shared surface, so the
            // attachment survives every one of those paths without a single
            // new case. A custom node would have needed all four, plus an
            // answer for what it renders as once the file is deleted.
            onAttached={(documents) => {
              for (const document of documents) {
                editorApiRef.current?.insertLink({
                  text: document.title,
                  href: noteDocumentHref(document.id),
                });
              }
            }}
          >
            <NoteEditor
              key={openNoteId}
              noteId={openNoteId}
              backHref={NOTES_BASE_PATH}
              onOpenNote={openNote}
              propertiesSlot={<NotePropertiesPanel noteId={openNoteId} />}
              breadcrumbSlot={
                <NoteBreadcrumb
                  noteId={openNoteId}
                  onOpenFolder={setRevealFolderId}
                />
              }
              onOpenCheatSheet={() => setCheatSheetOpen(true)}
            onEditorApiChange={(api) => {
              editorApiRef.current = api;
              editorStore.set(api?.editor ?? null);
            }}
              onOutlineChange={outlineStore.set}
              // Renaming from the editor's title field, rather than from a tree
              // row. Wired HERE because `note-actions` and `note-editor` are
              // sibling features, the same reason `propertiesSlot` and `actions`
              // above are passed in rather than imported — the widget is the
              // layer allowed to know about both.
              onTitleCommitted={(previousTitle, nextTitle) =>
                relabelInboundLinks(openNoteId, previousTitle, nextTitle)
              }
              // `setState(() => fn)`, not `setState(fn)`: React treats a bare
              // function argument as an updater and would call it immediately
              // with the previous state — storing a callback needs the wrapper.
              onLinkTrigger={(insert) => setInsertLink(() => insert)}
              actions={
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t('links.open')}
                    className="size-7 shrink-0 lg:hidden"
                    onClick={() => setLinksOpen(true)}
                  >
                    <Network className="size-4" />
                  </Button>

                  <NoteEditorActions
                    noteId={openNoteId}
                    onCreatedInside={openNote}
                    onRemoved={closeNote}
                  />
                </>
              }
            />
          </AttachmentDropZone>
        ) : (
          <div className="flex h-full flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            {t('emptySelection')}
          </div>
        )}

        {/* The reader, as a column. Only from `lg` up: at 1024 the tree and
            this leave 382px a side, which is tight but readable; below it
            there is nothing left to split and the dialog takes over. The
            Files aside gives up its 288px for this until `2xl`, where all
            four columns finally fit — see the aside below. */}
        {openNoteId && openDocument && (
          <>
            <div
              {...viewerPane.separatorProps}
              aria-label={t('attachments.resizeAriaLabel')}
              className="relative z-10 hidden w-1 shrink-0 cursor-col-resize bg-transparent transition-colors after:absolute after:inset-y-0 after:-left-2 after:-right-2 after:content-[''] hover:bg-primary/40 focus-visible:bg-primary/60 focus-visible:outline-none lg:block [@media(pointer:coarse)]:after:-left-5 [@media(pointer:coarse)]:after:-right-5"
            />
            <aside
              style={
                {
                  '--notes-viewer-w': `${viewerPane.width}px`,
                } as CSSProperties
              }
              className="hidden min-h-0 shrink-0 bg-background lg:flex lg:w-[var(--notes-viewer-w)]"
            >
              <NoteDocumentViewer
                documents={documents ?? []}
                activeId={openDocument}
                onSelect={setOpenDocumentId}
                onClose={() => setOpenDocumentId(null)}
                className="min-h-0 flex-1"
              />
            </aside>
          </>
        )}
      </main>

      {/* The links tree, in the slot the editor's own outline sidebar used to
          occupy. Desktop only — below `lg` the same panel is a sheet, opened
          from the editor header, because a third column at that width leaves
          nothing for the text. */}
      {openNoteId && (
        <aside
          className={cn(
            'hidden w-72 shrink-0 border-l bg-background',
            // Four columns do not fit under `2xl`. With the reader open at
            // 1024 this would leave the editor and the PDF 238px each, so the
            // panel that was just used to OPEN the file stands down until
            // there is room for both. The reader's own header carries the
            // step-between-attachments controls in the meantime.
            openDocument ? '2xl:flex 2xl:flex-col' : 'lg:flex lg:flex-col'
          )}
        >
          <OutlineSidebarTabs
            store={outlineStore}
            editorStore={editorStore}
            noteId={openNoteId}
            onOpen={openNote}
            activeDocumentId={openDocument}
            onOpenDocument={revealDocument}
            onReadDocument={setOpenDocumentId}
          />
        </aside>
      )}

      <Sheet
        open={linksOpen && openNoteId !== null}
        onOpenChange={setLinksOpen}
      >
        <SheetContent side="right" className="w-80 p-0 lg:hidden">
          <SheetTitle className="border-b px-3 py-3 text-sm font-semibold">
            {t('sidebar.title')}
          </SheetTitle>
          {openNoteId && (
            <OutlineSidebarTabs
              store={outlineStore}
              editorStore={editorStore}
              noteId={openNoteId}
              onOpen={openNote}
              activeDocumentId={openDocument}
              // Both close the sheet first: below `lg` it is full-screen, so
              // scrolling the editor behind it would be invisible and the
              // reader would open behind a scrim.
              onOpenDocument={(documentId) => {
                setLinksOpen(false);
                revealDocument(documentId);
              }}
              onReadDocument={(documentId) => {
                setLinksOpen(false);
                setOpenDocumentId(documentId);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      <NoteSearchPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={openNote}
        actions={[
          {
            id: 'new-note',
            label: t('search.actionNewNote'),
            icon: <Plus className="mr-2 size-4" />,
            onSelect: () => createFromPalette.mutate({}),
          },
          {
            id: 'cheat-sheet',
            label: t('search.actionCheatSheet'),
            icon: <CircleHelp className="mr-2 size-4" />,
            onSelect: () => setCheatSheetOpen(true),
          },
        ]}
      />

      {/* The `[[` picker: the same palette, opened for a different purpose.
          Closing it without choosing simply drops the callback — the trigger
          characters were already removed from the document. */}
      <NoteSearchPalette
        open={insertLink !== null}
        onOpenChange={(open) => {
          if (!open) setInsertLink(null);
        }}
        placeholder={t('links.pickerPlaceholder')}
        onSelect={(_id, hit) => {
          // The link TEXT is the title as it reads today; the href carries the
          // id, so renaming the target later does not break the link.
          insertLink?.({ text: hit.title, href: noteHref(hit.id) });
          setInsertLink(null);
        }}
      />

      {/* The reader, below `lg`: a dialog filling the screen. Mounted only
          when the column is not available, because a dialog hidden with CSS
          keeps its scroll lock and its focus trap — the same trap the links
          sheet above records. `hideClose` because the viewer draws its own
          toolbar; two X buttons an inch apart is a puzzle, not a choice. */}
      <Dialog
        open={!isViewerColumnVisible && openDocument !== null}
        onOpenChange={(next) => !next && setOpenDocumentId(null)}
      >
        <DialogContent
          hideClose
          aria-describedby={undefined}
          className="left-0 top-0 grid h-[100dvh] max-h-none w-screen max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 p-0"
        >
          <DialogTitle className="sr-only">
            {t('attachments.title')}
          </DialogTitle>
          {openDocument && (
            <NoteDocumentViewer
              documents={documents ?? []}
              activeId={openDocument}
              onSelect={setOpenDocumentId}
              onClose={() => setOpenDocumentId(null)}
              className="min-h-0"
            />
          )}
        </DialogContent>
      </Dialog>

      <MarkdownCheatSheetDialog
        open={cheatSheetOpen}
        onOpenChange={setCheatSheetOpen}
      />
    </div>
  );
}

/**
 * The only subscriber to the outline store — and the whole point of it being a
 * store. A keystroke now re-renders this leaf and the Contents list under it,
 * instead of the workspace.
 */
function OutlineSidebarTabs({
  store,
  editorStore,
  noteId,
  onOpen,
  activeDocumentId,
  onOpenDocument,
  onReadDocument,
}: {
  store: NoteOutlineStore;
  editorStore: NoteEditorStore;
  noteId: string;
  onOpen: (id: string) => void;
  activeDocumentId: string | null;
  onOpenDocument: (documentId: string) => void;
  onReadDocument: (documentId: string) => void;
}) {
  const outline = useNoteOutline(store);
  const editor = useNoteEditor(editorStore);

  return (
    <NoteSidebarTabs
      outline={outline}
      noteId={noteId}
      onOpen={onOpen}
      activeDocumentId={activeDocumentId}
      onOpenDocument={onOpenDocument}
      onReadDocument={onReadDocument}
      editor={editor}
    />
  );
}
