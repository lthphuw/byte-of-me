'use client';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@byte-of-me/ui';
import type { RichTextEditorApi } from '@byte-of-me/ui/rich-text-editor';
import { Download, FileDown, Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { NoteDetail } from '@/entities/note';
import { useNoteExport } from '@/features/dashboard/note-editor/lib/use-note-export';

export interface NoteExportMenuProps {
  note: NoteDetail | undefined;
  apiRef: React.RefObject<RichTextEditorApi | null>;
}

/** The editor header's export dropdown: `.md` download, and print → PDF. */
export function NoteExportMenu({ note, apiRef }: NoteExportMenuProps) {
  const t = useTranslations('dashboard.note');
  const { exportMarkdown, openPrintView } = useNoteExport(note, apiRef);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('export.label')}
          className="size-7 shrink-0"
        >
          <Download className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={exportMarkdown}>
          <FileDown className="mr-2 size-4" />
          {t('export.markdown')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={openPrintView}>
          <Printer className="mr-2 size-4" />
          {t('export.pdf')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
