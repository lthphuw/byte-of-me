'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@byte-of-me/ui';
import type { OutlineItem } from '@byte-of-me/ui/rich-text-editor';
import { useTranslations } from 'next-intl';

import { NoteOutline } from '@/features/dashboard/note-editor';
import { NoteLinksPanel } from '@/features/dashboard/note-links';

interface NoteSidebarTabsProps {
  outline: OutlineItem[];
  noteId: string;
  onOpen: (id: string) => void;
}

/**
 * The right sidebar's tab pair — one implementation for the `lg+` aside and the
 * below-`lg` sheet. PRD tab three (References) joins in Phase D with the
 * document uploads it lists.
 */
export function NoteSidebarTabs({
  outline,
  noteId,
  onOpen,
}: NoteSidebarTabsProps) {
  const t = useTranslations('dashboard.note.sidebar');

  return (
    <Tabs defaultValue="toc" className="flex h-full min-h-0 flex-col">
      <TabsList className="m-2 grid shrink-0 grid-cols-2">
        <TabsTrigger value="toc">{t('toc')}</TabsTrigger>
        <TabsTrigger value="links">{t('links')}</TabsTrigger>
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
