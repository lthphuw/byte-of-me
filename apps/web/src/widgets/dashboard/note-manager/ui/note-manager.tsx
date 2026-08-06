'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Sheet,
  SheetContent,
  SheetTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@byte-of-me/ui';
import type { OutlineItem } from '@byte-of-me/ui/rich-text-editor';
import { useQuery } from '@tanstack/react-query';
import { CircleHelp, Network, PanelLeftOpen, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { NoteTreePanel } from './note-tree-panel';

import {
  getAdminNoteById,
  getDescendantCount,
  NOTE_HREF_PREFIX,
  noteHref,
  noteKeys,
} from '@/entities/note';
import {
  NoteActionsMenu,
  NoteRowContextMenu,
  useCreateNote,
} from '@/features/dashboard/note-actions';
import {
  MarkdownCheatSheetDialog,
  NoteBreadcrumb,
  NoteEditor,
  NoteOutline,
} from '@/features/dashboard/note-editor';
import { NoteLinksPanel } from '@/features/dashboard/note-links';
import { NotePropertiesPanel } from '@/features/dashboard/note-properties';
import { NoteSearchPalette } from '@/features/dashboard/note-search';
import { useResizablePanel } from '@/shared/hooks/use-resizable-panel';
import { useRouter } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';

/**
 * Where a note lives. The same string `noteHref` builds for a `[[` link, so
 * the route and the links stored in documents cannot drift apart.
 */
export const NOTES_BASE_PATH = NOTE_HREF_PREFIX.replace(/\/$/, '');

/** What the editor hands back when the author picks a note to link to. */
type InsertLink = (link: { text: string; href: string }) => void;

export interface NoteManagerProps {
  /**
   * The open note *according to the route* — `null` on the list route
   * itself. Still the source of truth; just no longer the render input.
   * Everything below reads `openNoteId`, which lets a click draw the note
   * before the router has finished agreeing with it.
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

export function NoteManager({
  noteId: routeNoteId,
  navSlot,
}: NoteManagerProps) {
  const t = useTranslations('dashboard.note');
  const router = useRouter();

  // The note actually on screen. It leads the route rather than following
  // it: `(protected)/layout.tsx` is `force-dynamic` and the `[id]` page runs
  // a `getNoteTitle` query for its `generateMetadata`, so a note-to-note
  // `router.push` measured ~990ms before the URL even changed and ~2s before
  // the body appeared on a local dev server. Drawing off the click and
  // letting the URL catch up moves that entire round trip off the critical
  // path — the router still commits, so `[[` links, reload and Back keep
  // working exactly as before.
  const [openNoteId, setOpenNoteId] = useState<string | null>(routeNoteId);
  // Re-sync during render, not in an effect: an effect would paint one frame
  // of the stale note first, which is the flicker this whole change exists
  // to remove. React re-runs this component immediately on a render-phase
  // `setState` — the documented "adjusting state when a prop changes"
  // pattern — so nothing downstream ever sees the mismatched pair.
  //
  // The route moving is how EVERY non-click selection arrives: Back and
  // Forward, a reload, the `router.replace(NOTES_BASE_PATH)` the actions
  // menu fires after deleting the open note, and the push this component
  // made itself (which lands on the value already showing, so it is a
  // no-op). All of them must win over an optimistic pick.
  const lastRouteNoteId = useRef(routeNoteId);
  if (lastRouteNoteId.current !== routeNoteId) {
    lastRouteNoteId.current = routeNoteId;
    setOpenNoteId(routeNoteId);
  }

  const [searchOpen, setSearchOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  /** Set by a breadcrumb click; the tree opens onto that folder. */
  const [revealFolderId, setRevealFolderId] = useState<string | null>(null);

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

  // Cmd/Ctrl+B collapses the explorer, the way it does in VSCode. Simple like
  // the cheat-sheet binding rather than guarded like Cmd+K: `b` has no native
  // text-field binding under either modifier, so there is no editable-target
  // carve-out to make.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'b') return;
      if (!(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      sidebar.setCollapsed(!sidebar.isCollapsed);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebar]);
  const [linksOpen, setLinksOpen] = useState(false);
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false);
  // The open note's heading outline — reported by the editor, rendered by
  // the sidebar's ToC tab. Cleared on note switch so a heading-less note
  // never shows the previous note's outline while its editor mounts.
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  useEffect(() => {
    setOutline([]);
  }, [openNoteId]);
  // Non-null exactly while the `[[` picker is open. Holding the editor's own
  // insert callback here — rather than a boolean plus a reach back into the
  // editor — is what keeps `packages/ui` from having to know what a note is:
  // it hands out "how to insert a link", and this decides what to insert.
  const [insertLink, setInsertLink] = useState<InsertLink | null>(null);

  // Selection is still the URL — three things depend on it: a `[[` link in a
  // document points at `/space/notes/<id>` and has to resolve to something;
  // the mobile master–detail below wants the browser's own Back button
  // rather than a hand-rolled one; and a reload should reopen the note the
  // author was writing. The local `setOpenNoteId` is not a second source of
  // truth, it is the same answer arriving sooner.
  const openNote = useCallback(
    (id: string) => {
      setLinksOpen(false);
      setOpenNoteId(id);
      router.push(`${NOTES_BASE_PATH}/${id}`);
    },
    [router]
  );

  // Leaving the open note (delete, archive) is the same move in reverse:
  // clear locally, then let the route follow.
  const closeNote = useCallback(() => {
    setOpenNoteId(null);
    router.replace(NOTES_BASE_PATH);
  }, [router]);

  // The palette's "New note" — the same mutation the tree panel's `+` uses.
  const createFromPalette = useCreateNote(openNote);

  // Cmd/Ctrl+K opens search from anywhere on the page.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // `.toLowerCase()`, not a literal `'k'`: `event.key` is `'K'` with
      // Shift held or CapsLock on, and a strict `=== 'k'` silently missed
      // both.
      if (
        event.key.toLowerCase() !== 'k' ||
        !(event.metaKey || event.ctrlKey)
      ) {
        return;
      }

      // Already open: do nothing, rather than the previous toggle-closed.
      // cmdk's own `Command` root binds Ctrl+K to move its selection cursor
      // while focus is inside it (see cmdk's `onKeyDown`, the `case 'k':`
      // branch), which is exactly where focus sits whenever the palette is
      // open — so the same keystroke used to both navigate cmdk's list AND
      // close the dialog out from under it. Leaving this a one-way "open"
      // means a second Ctrl+K while already open is a no-op here, letting
      // cmdk have the keystroke to itself; Escape (radix's own binding)
      // still closes it.
      if (searchOpen) {
        return;
      }

      // Ctrl+K — NOT Cmd+K — is a native "kill to end of line" binding some
      // browsers honour inside a text field (notably macOS, inside plain
      // inputs and contenteditable regions alike). Cmd+K has no native
      // text-field binding anywhere and is the canonical palette shortcut,
      // so it must keep working regardless of where focus is — the note
      // title input and the rich-text body hold focus for essentially the
      // whole time a note is open, which is exactly where an author would
      // press it. Bailing out for BOTH modifiers over an editable target,
      // the previous fix, left Cmd+K dead in that one place and, since this
      // handler correctly stopped calling `preventDefault` on that path,
      // handed the keystroke to the browser instead (Chrome on macOS
      // focuses the omnibox).
      if (event.ctrlKey && !event.metaKey) {
        const target = event.target;
        const isEditable =
          target instanceof HTMLElement &&
          (target.isContentEditable ||
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA');
        if (isEditable) {
          return;
        }
      }

      event.preventDefault();
      setSearchOpen(true);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [searchOpen]);

  // Cmd/Ctrl+/ opens the markdown cheat-sheet. Simpler than the Cmd+K
  // handler above on purpose: `/` has no native text-field binding with
  // either modifier held, so there is no editable-target carve-out to make.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      setCheatSheetOpen(true);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex min-h-0 flex-1">
      {/* Master–detail, by CSS rather than by unmounting: below `md` exactly
          one of these two panes is on screen at a time, and which one is
          decided by the route. Both stay mounted so crossing the breakpoint —
          or opening and closing a note — never discards the tree query.

          This replaces the drawer the tree used to live in on phones. The
          drawer was the thing whose close button sat on top of the "new note"
          `+` (see `SheetContent`'s `hideClose`), and it also meant the editor
          was always one overlay away from the list rather than one screen. */}
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
            <NoteActionsMenuWithCount
              noteId={node.id}
              title={node.title}
              isArchived={node.archivedAt !== null}
              isPinned={node.isPinned}
              onCreatedInside={openNote}
              onRename={startRename}
              onRemoved={(removedId) => {
                // Only the note currently open needs the route changed out
                // from under it; archiving some other row leaves the author
                // exactly where they were.
                if (removedId === openNoteId) closeNote();
              }}
              // Always visible on touch, hover-revealed on desktop: a phone
              // has no hover state to reveal it with, and a control that
              // never appears is the same as one that does not exist.
              className="opacity-100 transition-opacity md:opacity-0 md:focus-visible:opacity-100 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
            />
          )}
          renderContextMenu={(node, row, startRename) => (
            <NoteRowContextMenuWithCount
              noteId={node.id}
              title={node.title}
              isArchived={node.archivedAt !== null}
              isPinned={node.isPinned}
              onCreatedInside={openNote}
              onRename={startRename}
              onRemoved={(removedId) => {
                if (removedId === openNoteId) closeNote();
              }}
            >
              {row}
            </NoteRowContextMenuWithCount>
          )}
        />
      </aside>

      {/* The drag handle, between the two panes. Desktop only: below `md` the
          panes are two screens and there is no boundary to drag. Its own
          element rather than a border on the aside, because a 1px border is
          not a pointer target — this is 4px wide and lights up on hover. */}
      {!sidebar.isCollapsed && (
        <div
          {...sidebar.separatorProps}
          aria-label={t('explorer.resizeAriaLabel')}
          className="hidden w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-primary/40 focus-visible:bg-primary/60 focus-visible:outline-none md:block"
        />
      )}

      {/* Collapsed, the explorer leaves a rail behind rather than vanishing.
          A keyboard shortcut is not a way back for someone who collapsed the
          pane by accident, and with no note open there would otherwise be
          nothing on screen at all. */}
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
            // with the previous state — storing a callback needs the extra
            // wrapper.
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

                <OpenNoteActions
                  noteId={openNoteId}
                  untitledLabel={t('untitled')}
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
          occupy (see `chromeless` in `rich-text-editor.tsx`). Desktop only —
          below `lg` the same panel is a sheet, opened from the editor header,
          because a third column at that width leaves nothing for the text. */}
      {openNoteId && (
        <aside className="hidden w-72 shrink-0 border-l bg-background lg:flex lg:flex-col">
          <SidebarTabs
            tocLabel={t('sidebar.toc')}
            linksLabel={t('sidebar.links')}
            outline={outline}
            noteId={openNoteId}
            onOpen={openNote}
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
            <SidebarTabs
              tocLabel={t('sidebar.toc')}
              linksLabel={t('sidebar.links')}
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
          characters were already removed from the document, so nothing is
          left behind to tidy up. */}
      <NoteSearchPalette
        open={insertLink !== null}
        onOpenChange={(open) => {
          if (!open) setInsertLink(null);
        }}
        placeholder={t('links.pickerPlaceholder')}
        onSelect={(_id, hit) => {
          // The link TEXT is the title as it reads today; the href carries
          // the id, so renaming the target later does not break the link,
          // and the panel always resolves current titles.
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

/**
 * The right sidebar's tab pair — one implementation for the `lg+` aside and
 * the below-`lg` sheet. PRD tab three (References) joins in Phase D with the
 * document uploads it lists.
 */
function SidebarTabs({
  tocLabel,
  linksLabel,
  outline,
  noteId,
  onOpen,
}: {
  tocLabel: string;
  linksLabel: string;
  outline: OutlineItem[];
  noteId: string;
  onOpen: (id: string) => void;
}) {
  return (
    <Tabs defaultValue="toc" className="flex h-full min-h-0 flex-col">
      <TabsList className="m-2 grid shrink-0 grid-cols-2">
        <TabsTrigger value="toc">{tocLabel}</TabsTrigger>
        <TabsTrigger value="links">{linksLabel}</TabsTrigger>
      </TabsList>
      <TabsContent value="toc" className="mt-0 min-h-0 flex-1 overflow-y-auto">
        <NoteOutline items={outline} />
      </TabsContent>
      <TabsContent
        value="links"
        className="mt-0 min-h-0 flex-1 overflow-y-auto"
      >
        <NoteLinksPanel noteId={noteId} onOpen={onOpen} />
      </TabsContent>
    </Tabs>
  );
}

/**
 * The editor header's actions menu, for whichever note is open.
 *
 * The four things the menu needs about that note — title, archived, pinned,
 * folder — used to be looked up by scanning `getNoteTree`'s whole-corpus
 * result for the one matching row. They all live on `NoteDetail` too, and the
 * editor mounted directly below has `noteKeys.detail(noteId)` open anyway, so
 * reading the same key with the same `queryFn` costs nothing: TanStack serves
 * both subscribers from the one fetch. Scanning an entire corpus to answer a
 * question about a single known id was the expensive way round.
 *
 * A separate component purely so `noteId` is non-null here. The alternative is
 * a placeholder key plus `enabled`, which puts a cache entry under an id that
 * does not exist and makes the parent's null-handling everyone else's problem.
 */
function OpenNoteActions({
  noteId,
  untitledLabel,
  onCreatedInside,
  onRemoved,
}: {
  noteId: string;
  /** `t('untitled')`, passed down: this is below the `useTranslations` call. */
  untitledLabel: string;
  onCreatedInside: (noteId: string) => void;
  onRemoved: () => void;
}) {
  const { data: note } = useQuery({
    queryKey: noteKeys.detail(noteId),
    queryFn: async () => {
      const res = await getAdminNoteById(noteId);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
  });

  return (
    <NoteActionsMenuWithCount
      noteId={noteId}
      title={note?.title ?? untitledLabel}
      isArchived={note?.archivedAt != null}
      isPinned={note?.isPinned ?? false}
      onCreatedInside={onCreatedInside}
      onRemoved={onRemoved}
    />
  );
}

/**
 * `NoteActionsMenu`, with its descendant count fetched when the author
 * actually reaches for the menu.
 *
 * The count is read in exactly one place: the delete confirmation, where it is
 * the difference between "this note will be deleted" and "this note and the
 * eleven under it will be deleted". It used to come from
 * `collectDescendantIds` walking the corpus in memory — which only worked
 * because the sidebar held every note the author owns, the read this whole
 * change removes. Once the tree loads one level at a time, a collapsed
 * folder's subtree is not in the browser at all, so the question goes to the
 * database instead (`getDescendantCount`, one recursive CTE).
 *
 * Fetched lazily, and that is the point of this wrapper. `renderActions` runs
 * for EVERY visible row, so a query mounted unconditionally would be one
 * request per note on screen — trading a single corpus read for a burst of
 * small ones is not a win. `armed` flips on the first pointer-down or focus
 * anywhere inside, which is the gesture that opens the menu: radix opens its
 * trigger on `pointerdown`, and a keyboard user has to focus it before
 * pressing anything. So exactly the rows whose menus were opened cost a
 * request, and the fetch starts while the dropdown is still animating in.
 *
 * The wrapper `<span>` exists only to carry those two capture handlers.
 * `NoteActionsMenu` owns the menu's open state and would be the natural place
 * to hook, but it is outside this task's scope; `display: contents` keeps the
 * span out of layout entirely, so the row's hover-reveal (`md:group-hover`
 * classes on the button, resolved against an ancestor `group`) is unaffected.
 *
 * Before the count lands the menu is passed `0`, which renders the plain
 * single-note wording and swaps to the counted one when the query resolves.
 * That window is one round trip that begins when the menu opens and the
 * author still has to cross the dropdown to the destructive item; the
 * alternative — blocking the dialog on a fetch — is a spinner inside a
 * confirmation, which is worse for the case it is meant to protect.
 */
function useArmedDescendantCount(noteId: string) {
  const [armed, setArmed] = useState(false);

  // Re-armed per note, in the render-phase style this file already uses for
  // `openNoteId`. Tree rows are keyed by id so they remount, but the header's
  // menu is one long-lived instance that follows whichever note is open —
  // without this, opening any menu once would leave every note opened
  // afterwards fetching a count nothing has asked to see.
  const lastNoteId = useRef(noteId);
  if (lastNoteId.current !== noteId) {
    lastNoteId.current = noteId;
    setArmed(false);
  }

  const { data } = useQuery({
    queryKey: noteKeys.descendantCount(noteId),
    queryFn: async () => {
      const res = await getDescendantCount(noteId);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    enabled: armed,
    // Overrides the client's global 60s. This number is the sentence
    // "and its N nested notes" in a PERMANENT-DELETE confirmation, and a
    // cached one understates what is about to be destroyed: open the dialog,
    // cancel, add two notes to that folder, reopen inside the window, and the
    // author is told 3 while 5 are deleted. Always ask.
    staleTime: 0,
  });

  // Before the count lands the menu is passed `0`, which renders the plain
  // single-note wording and swaps to the counted one when the query resolves.
  // That window is one round trip that begins when the menu opens and the
  // author still has to cross the dropdown to the destructive item; the
  // alternative — blocking the dialog on a fetch — is a spinner inside a
  // confirmation, which is worse for the case it is meant to protect.
  return { descendantCount: data ?? 0, arm: () => setArmed(true) };
}

function NoteActionsMenuWithCount({
  noteId,
  ...props
}: Omit<React.ComponentProps<typeof NoteActionsMenu>, 'descendantCount'>) {
  const { descendantCount, arm } = useArmedDescendantCount(noteId);

  return (
    <span
      className="contents"
      onPointerDownCapture={arm}
      onFocusCapture={arm}
    >
      <NoteActionsMenu
        {...props}
        noteId={noteId}
        descendantCount={descendantCount}
      />
    </span>
  );
}

/**
 * The right-click menu, armed the same lazy way.
 *
 * `onContextMenuCapture` rather than the pointer handler above: a right-click
 * does produce a `pointerdown`, but capture on the event that actually opens
 * this menu is the honest hook, and it fires before radix's own trigger
 * handler — so the count request is already in flight while the menu animates
 * in. `display: contents` keeps this wrapper out of layout, exactly as it does
 * for the dropdown's.
 */
function NoteRowContextMenuWithCount({
  noteId,
  ...props
}: Omit<React.ComponentProps<typeof NoteRowContextMenu>, 'descendantCount'>) {
  const { descendantCount, arm } = useArmedDescendantCount(noteId);

  return (
    <span className="contents" onContextMenuCapture={arm}>
      <NoteRowContextMenu
        {...props}
        noteId={noteId}
        descendantCount={descendantCount}
      />
    </span>
  );
}
