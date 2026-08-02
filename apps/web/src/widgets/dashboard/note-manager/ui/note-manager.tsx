'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@byte-of-me/ui';
import { PanelLeft, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { NoteTreePanel } from './note-tree-panel';

import { NoteEditor } from '@/features/dashboard/note-editor';
import { NoteSearchPalette } from '@/features/dashboard/note-search';

export function NoteManager() {
  const t = useTranslations('dashboard.note');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false);

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

  const tree = (
    <NoteTreePanel
      activeId={activeId}
      onSelect={(id) => {
        setActiveId(id);
        // Picking a note is the whole reason the drawer was opened, so it
        // closes itself rather than leaving the author to dismiss a panel
        // covering the note they just asked for.
        setTreeOpen(false);
      }}
      onOpenSearch={() => setSearchOpen(true)}
    />
  );

  return (
    <div className="flex h-[calc(100dvh-8rem)] overflow-hidden rounded-lg border">
      {/* Desktop: always on screen. Hidden rather than unmounted below `md`
          so the tree query is not discarded and refetched every time the
          viewport crosses the breakpoint. */}
      <aside className="hidden w-64 shrink-0 border-r md:block">{tree}</aside>

      {/* Mobile: the same panel in a drawer. Until this existed a phone had no
          tree, no create button and no search trigger — the whole workspace
          was a single line of text telling the author to select a note they
          had no way to reach. */}
      <Sheet open={treeOpen} onOpenChange={setTreeOpen}>
        <SheetContent side="left" className="w-72 p-0 md:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>{t('title')}</SheetTitle>
          </SheetHeader>
          {tree}
        </SheetContent>
      </Sheet>

      <main className="flex min-w-0 flex-1 flex-col">
        {/* Mobile-only header: the drawer handle plus the search trigger the
            desktop tree owns. `md:hidden` so the desktop layout is untouched. */}
        <div className="flex items-center gap-1 border-b p-2 md:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('title')}
            onClick={() => setTreeOpen(true)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1 justify-start gap-2 text-muted-foreground"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-3.5 w-3.5" />
            {t('search.trigger')}
          </Button>
        </div>

        <div className="min-h-0 flex-1">
          {activeId ? (
            <NoteEditor key={activeId} noteId={activeId} />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
              {t('emptySelection')}
            </div>
          )}
        </div>
      </main>

      <NoteSearchPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={setActiveId}
      />
    </div>
  );
}
