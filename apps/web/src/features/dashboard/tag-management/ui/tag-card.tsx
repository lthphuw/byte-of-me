'use client';

import { Tag as TagIcon } from 'lucide-react';
import { useLocale } from 'next-intl';

import { type AdminTag, tagDisplayName } from '@/entities/tag';
import { RecordListItem, RecordRowActions } from '@/shared/ui';

interface TagCardProps {
  tag: AdminTag;
  onEdit: (tag: AdminTag) => void;
  onDelete: (tag: AdminTag) => void;
  isDeleting: boolean;
}

/** One tag in the manager's grid: its name and slug, with the row actions always visible. */
export function TagCard({ tag, onEdit, onDelete, isDeleting }: TagCardProps) {
  const locale = useLocale();
  const displayName = tagDisplayName(tag, locale);

  return (
    <RecordListItem
      leading={
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <TagIcon className="size-5" aria-hidden />
        </div>
      }
      actions={
        <RecordRowActions
          name={displayName}
          onEdit={() => onEdit(tag)}
          onDelete={() => onDelete(tag)}
          disabled={isDeleting}
        />
      }
    >
      <p className="truncate text-sm font-semibold">{displayName}</p>
      <p className="truncate font-mono text-[10px] uppercase text-muted-foreground">
        {tag.slug}
      </p>
    </RecordListItem>
  );
}
