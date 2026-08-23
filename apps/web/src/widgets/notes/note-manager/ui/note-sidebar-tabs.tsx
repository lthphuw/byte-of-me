'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@byte-of-me/ui';
import type { OutlineItem } from '@byte-of-me/ui/rich-text-editor';
import type { Editor } from '@tiptap/core';
import { useTranslations } from 'next-intl';

import { NoteAttachmentsPanel } from '@/features/notes/note-attachments';
import { NoteOutline } from '@/features/notes/note-editor';
import { NoteLinksPanel } from '@/features/notes/note-links';
import { LazyReferencePanel } from '@/shared/ui/lazy-reference-panel';

interface NoteSidebarTabsProps {
  outline: OutlineItem[];
  noteId: string;
  onOpen: (id: string) => void;
  /** The attachment the viewer has open, so its row can show as selected. */
  activeDocumentId: string | null;
  /** A row was clicked: go to where the file sits in the note's text. */
  onOpenDocument: (documentId: string) => void;
  /** The row menu's "open": read the file. */
  onReadDocument: (documentId: string) => void;
  /**
   * The open note's live editor, or `null` while it mounts. The References
   * panel drives the document through Tiptap commands, so it cannot render
   * before there is a document to drive.
   */
  editor: Editor | null;
}

/**
 * The right sidebar's four tabs — one implementation for the `lg+` aside and
 * the below-`lg` sheet.
 *
 * "Files", not "References", and that is not a style choice: `packages/ui`'s
 * editor already owns the word for academic citations, with its own panel, its
 * own numbering and its own `references` tab. Two unrelated features under one
 * name in the same product is how an author learns to distrust both. That
 * panel is the "Cite" tab below — labelled with the verb, so the two names
 * cannot be confused with each other at a glance either.
 */
export function NoteSidebarTabs({
  outline,
  noteId,
  onOpen,
  activeDocumentId,
  onOpenDocument,
  onReadDocument,
  editor,
}: NoteSidebarTabsProps) {
  const t = useTranslations('dashboard.note.sidebar');

  return (
    <Tabs defaultValue="toc" className="flex h-full min-h-0 flex-col">
      <TabsList className="m-2 grid shrink-0 grid-cols-4">
        <TabsTrigger value="toc">{t('toc')}</TabsTrigger>
        <TabsTrigger value="files">{t('files')}</TabsTrigger>
        <TabsTrigger value="links">{t('links')}</TabsTrigger>
        <TabsTrigger value="cite">{t('cite')}</TabsTrigger>
      </TabsList>
      <TabsContent
        value="toc"
        className="pb-safe mt-0 min-h-0 flex-1 overflow-y-auto"
      >
        <NoteOutline items={outline} />
      </TabsContent>
      <TabsContent
        value="files"
        className="pb-safe mt-0 min-h-0 flex-1 overflow-y-auto"
      >
        <NoteAttachmentsPanel
          noteId={noteId}
          activeId={activeDocumentId}
          onOpen={onOpenDocument}
          onRead={onReadDocument}
        />
      </TabsContent>
      <TabsContent
        value="links"
        className="pb-safe mt-0 min-h-0 flex-1 overflow-y-auto"
      >
        <NoteLinksPanel noteId={noteId} onOpen={onOpen} />
      </TabsContent>
      {/* `pb-6` and the safe-area inset combined explicitly, not as two
          separate `pb-*` classes on one element — Tailwind gives no ordering
          guarantee between two same-property utilities on the same node, so
          `pb-6 pb-safe` would leave which one wins undefined. */}
      <TabsContent
        value="cite"
        className="mt-0 min-h-0 flex-1 overflow-y-auto px-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        {editor && <LazyReferencePanel editor={editor} />}
      </TabsContent>
    </Tabs>
  );
}
