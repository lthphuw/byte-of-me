'use client';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@byte-of-me/ui';
import { LayoutList } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type {
  ExplorerMode,
  ExplorerPrefsUpdate,
  FlatSort,
  GroupBy,
} from '@/features/dashboard/note-explorer/lib/explorer-model';

/** The explorer's view switcher: mode, plus the mode's own sub-choice. */
export function ExplorerViewMenu({
  mode,
  sort,
  groupBy,
  onChange,
}: {
  mode: ExplorerMode;
  sort: FlatSort;
  groupBy: GroupBy;
  onChange: (next: ExplorerPrefsUpdate) => void;
}) {
  const t = useTranslations('dashboard.note.explorer');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('viewMode')}
        >
          <LayoutList className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t('viewMode')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => onChange({ mode: value as ExplorerMode })}
        >
          <DropdownMenuRadioItem value="tree">
            {t('modes.tree')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="flat">
            {t('modes.flat')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="grouped">
            {t('modes.grouped')}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        {mode === 'flat' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t('sortLabel')}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(value) => onChange({ sort: value as FlatSort })}
            >
              <DropdownMenuRadioItem value="updated">
                {t('sort.updated')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="created">
                {t('sort.created')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="title">
                {t('sort.title')}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </>
        )}

        {mode === 'grouped' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t('groupByLabel')}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={groupBy}
              onValueChange={(value) =>
                onChange({ groupBy: value as GroupBy })
              }
            >
              <DropdownMenuRadioItem value="status">
                {t('groupBy.status')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="label">
                {t('groupBy.label')}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
