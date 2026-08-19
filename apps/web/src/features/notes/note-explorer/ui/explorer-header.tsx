'use client';

import { Button } from '@byte-of-me/ui';
import { FolderPlus, Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { ExplorerPrefsUpdate } from '@/features/notes/note-explorer/lib/explorer-model';
import type { ExplorerPrefs } from '@/features/notes/note-explorer/lib/use-explorer-prefs';
import { ExplorerViewMenu } from '@/features/notes/note-explorer/ui/explorer-view-menu';

interface ExplorerHeaderProps {
  prefs: ExplorerPrefs;
  onPrefsChange: (next: ExplorerPrefsUpdate) => void;
  /** The trash hides the view menu and both create buttons. */
  includeArchived: boolean;
  onOpenSearch: () => void;
  /** Opens a draft row; `true` for a folder. */
  onStartDraft: (isFolder: boolean) => void;
  /** Space navigation, mounted here on phones. */
  navSlot?: React.ReactNode;
}

/**
 * The explorer's top bar: search, view mode, and the two create buttons.
 *
 * Both create buttons open a DRAFT ROW rather than writing an "Untitled" note
 * straight away, and both aim at the explorer's selection rather than
 * unconditionally at the root — the two things that made every new note start
 * with a rename and a drag.
 *
 * Both are hidden in the trash, where `+` used to remain and create a live root
 * note. A draft row has nowhere to appear there — the trash is a flat archived
 * list, not the tree — so the button would open an invisible input. "Create a
 * note from inside the wastebasket" was never a coherent offer anyway.
 */
export function ExplorerHeader({
  prefs,
  onPrefsChange,
  includeArchived,
  onOpenSearch,
  onStartDraft,
  navSlot,
}: ExplorerHeaderProps) {
  const t = useTranslations('dashboard.note');

  return (
    <div className="flex items-center gap-1 border-b p-2">
      {navSlot}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-w-0 flex-1 justify-start gap-2 text-muted-foreground"
        onClick={onOpenSearch}
      >
        <Search className="size-3.5 shrink-0" />
        <span className="truncate">{t('search.trigger')}</span>
      </Button>

      {!includeArchived && (
        <>
          <ExplorerViewMenu
            mode={prefs.mode}
            sort={prefs.sort}
            groupBy={prefs.groupBy}
            onChange={onPrefsChange}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.newFolder')}
            onClick={() => onStartDraft(true)}
          >
            <FolderPlus className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.create')}
            onClick={() => onStartDraft(false)}
          >
            <Plus className="size-4" />
          </Button>
        </>
      )}
    </div>
  );
}
