'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Sheet,
  SheetContent,
  SheetTitle,
} from '@byte-of-me/ui';
import { useQuery } from '@tanstack/react-query';
import { Network } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { NoteTreePanel } from './note-tree-panel';

import {
  collectDescendantIds,
  getNoteTree,
  NOTE_HREF_PREFIX,
  noteHref,
  noteKeys,
} from '@/entities/note';
import { NoteActionsMenu } from '@/features/dashboard/note-actions';
import { NoteEditor } from '@/features/dashboard/note-editor';
import { NoteLinksPanel } from '@/features/dashboard/note-links';
import { NoteSearchPalette } from '@/features/dashboard/note-search';
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
  /** The open note, taken from the route — `null` on the list route itself. */
  noteId: string | null;
  /**
   * The space navigation trigger, mounted in the list header on phones.
   * Passed in by the page rather than imported here: both are widgets, and a
   * widget importing another widget is the sideways import AGENTS §3 rules
   * out. The app layer is where two widgets get composed.
   */
  navSlot?: React.ReactNode;
}

export function NoteManager({ noteId, navSlot }: NoteManagerProps) {
  const t = useTranslations('dashboard.note');
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  // Non-null exactly while the `[[` picker is open. Holding the editor's own
  // insert callback here — rather than a boolean plus a reach back into the
  // editor — is what keeps `packages/ui` from having to know what a note is:
  // it hands out "how to insert a link", and this decides what to insert.
  const [insertLink, setInsertLink] = useState<InsertLink | null>(null);

  // Selection is the URL, not state. Three things depend on it: a `[[` link
  // in a document points at `/space/notes/<id>` and has to resolve to
  // something; the mobile master–detail below wants the browser's own Back
  // button rather than a hand-rolled one; and a reload should reopen the note
  // the author was writing.
  const openNote = useCallback(
    (id: string) => {
      setLinksOpen(false);
      router.push(`${NOTES_BASE_PATH}/${id}`);
    },
    [router]
  );

  // The same query key the tree panel uses, so TanStack serves both
  // subscribers from one fetch. It is read here for two things the panel
  // cannot answer for the *open* note: whether it is archived, and how many
  // notes the cascade would take with it on a permanent delete.
  const { data: rows } = useQuery({
    queryKey: noteKeys.tree(showArchived),
    queryFn: async () => {
      const res = await getNoteTree(showArchived);
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
  });

  const activeNode = useMemo(
    () => (noteId ? rows?.find((row) => row.id === noteId) : undefined),
    [rows, noteId]
  );

  const activeDescendantCount = useMemo(
    () => (noteId && rows ? collectDescendantIds(rows, noteId).length : 0),
    [rows, noteId]
  );

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
        className={cn(
          'flex min-h-0 w-full shrink-0 flex-col border-r bg-background md:flex md:w-64',
          noteId && 'hidden'
        )}
      >
        <NoteTreePanel
          activeId={noteId}
          includeArchived={showArchived}
          onToggleArchived={() => setShowArchived((current) => !current)}
          onSelect={openNote}
          onOpenSearch={() => setSearchOpen(true)}
          navSlot={navSlot}
          renderActions={(node) => (
            <NoteActionsMenu
              noteId={node.id}
              title={node.title}
              isArchived={node.archivedAt !== null}
              descendantCount={
                rows ? collectDescendantIds(rows, node.id).length : 0
              }
              onRemoved={(removedId) => {
                // Only the note currently open needs the route changed out
                // from under it; archiving some other row leaves the author
                // exactly where they were.
                if (removedId === noteId) router.replace(NOTES_BASE_PATH);
              }}
              // Always visible on touch, hover-revealed on desktop: a phone
              // has no hover state to reveal it with, and a control that
              // never appears is the same as one that does not exist.
              className="opacity-100 transition-opacity md:opacity-0 md:focus-visible:opacity-100 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
            />
          )}
        />
      </aside>

      <main
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col bg-background md:flex',
          !noteId && 'hidden'
        )}
      >
        {noteId ? (
          <NoteEditor
            key={noteId}
            noteId={noteId}
            backHref={NOTES_BASE_PATH}
            onOpenNote={openNote}
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

                <NoteActionsMenu
                  noteId={noteId}
                  title={activeNode?.title ?? t('untitled')}
                  isArchived={activeNode?.archivedAt != null}
                  descendantCount={activeDescendantCount}
                  onRemoved={() => router.replace(NOTES_BASE_PATH)}
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
      {noteId && (
        <aside className="hidden w-72 shrink-0 border-l bg-background lg:flex lg:flex-col">
          <h2 className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('links.title')}
          </h2>
          <NoteLinksPanel noteId={noteId} onOpen={openNote} />
        </aside>
      )}

      <Sheet open={linksOpen && noteId !== null} onOpenChange={setLinksOpen}>
        <SheetContent side="right" className="w-80 p-0 lg:hidden">
          <SheetTitle className="border-b px-3 py-3 text-sm font-semibold">
            {t('links.title')}
          </SheetTitle>
          {noteId && <NoteLinksPanel noteId={noteId} onOpen={openNote} />}
        </SheetContent>
      </Sheet>

      <NoteSearchPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={openNote}
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
    </div>
  );
}
