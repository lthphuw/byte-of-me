'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@byte-of-me/ui';
import type { OutlineItem } from '@byte-of-me/ui/rich-text-editor';
import { useTranslations } from 'next-intl';

import { NoteAttachmentsPanel } from '@/features/notes/note-attachments';
import { NoteOutline } from '@/features/notes/note-editor';
import { NoteLinksPanel } from '@/features/notes/note-links';

interface NoteSidebarTabsProps {
  outline: OutlineItem[];
  noteId: string;
  onOpen: (id: string) => void;
  /** The attachment the viewer has open, so its row can show as selected. */
  activeDocumentId: string | null;
  /** Ask to read one. The widget owns the split pane and the dialog. */
  onOpenDocument: (documentId: string) => void;
}

/**
 * The right sidebar's three tabs — one implementation for the `lg+` aside and
 * the below-`lg` sheet.
 *
 * "Files", not "References", and that is not a style choice: `packages/ui`'s
 * editor already owns the word for academic citations, with its own panel, its
 * own numbering and its own `references` tab. Two unrelated features under one
 * name in the same product is how an author learns to distrust both.
 */
export function NoteSidebarTabs({
  outline,
  noteId,
  onOpen,
  activeDocumentId,
  onOpenDocument,
}: NoteSidebarTabsProps) {
  const t = useTranslations('dashboard.note.sidebar');

  return (
    <Tabs defaultValue="toc" className="flex h-full min-h-0 flex-col">
      <TabsList className="m-2 grid shrink-0 grid-cols-3">
        <TabsTrigger value="toc">{t('toc')}</TabsTrigger>
        <TabsTrigger value="files">{t('files')}</TabsTrigger>
        <TabsTrigger value="links">{t('links')}</TabsTrigger>
      </TabsList>
      <TabsContent value="toc" className="mt-0 min-h-0 flex-1 overflow-y-auto">
        <NoteOutline items={outline} />
      </TabsContent>
      <TabsContent
        value="files"
        className="mt-0 min-h-0 flex-1 overflow-y-auto"
      >
        <NoteAttachmentsPanel
          noteId={noteId}
          activeId={activeDocumentId}
          onOpen={onOpenDocument}
        />
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
