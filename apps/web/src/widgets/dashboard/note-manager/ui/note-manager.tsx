'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Sheet, SheetContent, SheetTitle } from '@byte-of-me/ui';
import type { OutlineItem } from '@byte-of-me/ui/rich-text-editor';
import { CircleHelp, Network, PanelLeftOpen, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { NoteEditorActions } from './note-editor-actions';
import { NoteSidebarTabs } from './note-sidebar-tabs';
import { NoteTreePanel } from './note-tree-panel';

import { NOTE_HREF_PREFIX, noteHref } from '@/entities/note';
import {
  NoteActionsMenu,
  NoteRowContextMenu,
  useCreateNote,
} from '@/features/dashboard/note-actions';
import {
  MarkdownCheatSheetDialog,
  NoteBreadcrumb,
  NoteEditor,
} from '@/features/dashboard/note-editor';
import { NotePropertiesPanel } from '@/features/dashboard/note-properties';
import { NoteSearchPalette } from '@/features/dashboard/note-search';
import { useResizablePanel } from '@/shared/hooks/use-resizable-panel';
import { useRouter } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import { useWorkspaceShortcuts } from '@/widgets/dashboard/note-manager/lib/use-workspace-shortcuts';

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
export function NoteManager({ noteId: routeNoteId, navSlot }: NoteManagerProps) {
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
  const [showArchived, setShowArchived] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  /** Set by a breadcrumb click; the tree opens onto that folder. */
  const [revealFolderId, setRevealFolderId] = useState<string | null>(null);
  // The open note's heading outline — reported by the editor, rendered by the
  // sidebar's ToC tab. Cleared on note switch so a heading-less note never
  // shows the previous note's outline while its editor mounts.
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  useEffect(() => {
    setOutline([]);
  }, [openNoteId]);
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

  return (
    <div className="flex min-h-0 flex-1">
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
        <NoteTreePanel
          activeId={openNoteId}
          includeArchived={showArchived}
          onToggleArchived={() => setShowArchived((current) => !current)}
          onSelect={openNote}
          onOpenSearch={() => setSearchOpen(true)}
          navSlot={navSlot}
          revealFolderId={revealFolderId}
          renderActions={(node, startRename) => (
            <NoteActionsMenu
              noteId={node.id}
              title={node.title}
              isArchived={node.archivedAt !== null}
              isPinned={node.isPinned}
              onCreatedInside={openNote}
              onRename={startRename}
              onRemoved={onRowRemoved}
              // Always visible on touch, hover-revealed on desktop: a phone has
              // no hover state to reveal it with, and it is the ONLY way to the
              // menu there — long-press belongs to dragging. See
              // `NoteRowContextMenu`.
              className="opacity-100 transition-opacity md:opacity-0 md:focus-visible:opacity-100 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
            />
          )}
          renderContextMenu={(node, row, startRename) => (
            <NoteRowContextMenu
              noteId={node.id}
              title={node.title}
              isArchived={node.archivedAt !== null}
              isPinned={node.isPinned}
              onCreatedInside={openNote}
              onRename={startRename}
              onRemoved={onRowRemoved}
            >
              {row}
            </NoteRowContextMenu>
          )}
        />
      </aside>

      {/* The drag handle, between the two panes. Desktop only: below `md` the
          panes are two screens and there is no boundary to drag. Its own
          element rather than a border on the aside, because a 1px border is not
          a pointer target — this is 4px wide and lights up on hover. */}
      {!sidebar.isCollapsed && (
        <div
          {...sidebar.separatorProps}
          aria-label={t('explorer.resizeAriaLabel')}
          className="hidden w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-primary/40 focus-visible:bg-primary/60 focus-visible:outline-none md:block"
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
          'flex min-h-0 min-w-0 flex-1 flex-col bg-background md:flex',
          !openNoteId && 'hidden'
        )}
      >
        {openNoteId ? (
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
            onOutlineChange={setOutline}
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
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
            {t('emptySelection')}
          </div>
        )}
      </main>

      {/* The links tree, in the slot the editor's own outline sidebar used to
          occupy. Desktop only — below `lg` the same panel is a sheet, opened
          from the editor header, because a third column at that width leaves
          nothing for the text. */}
      {openNoteId && (
        <aside className="hidden w-72 shrink-0 border-l bg-background lg:flex lg:flex-col">
          <NoteSidebarTabs
            outline={outline}
            noteId={openNoteId}
            onOpen={openNote}
          />
        </aside>
      )}

      <Sheet open={linksOpen && openNoteId !== null} onOpenChange={setLinksOpen}>
        <SheetContent side="right" className="w-80 p-0 lg:hidden">
          <SheetTitle className="border-b px-3 py-3 text-sm font-semibold">
            {t('sidebar.title')}
          </SheetTitle>
          {openNoteId && (
            <NoteSidebarTabs
              outline={outline}
              noteId={openNoteId}
              onOpen={openNote}
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

      <MarkdownCheatSheetDialog
        open={cheatSheetOpen}
        onOpenChange={setCheatSheetOpen}
      />
    </div>
  );
}
