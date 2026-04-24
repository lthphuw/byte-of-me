'use client';

import { Tag as TagIcon } from 'lucide-react';
import { useLocale } from 'next-intl';

import type { AdminTag } from '@/entities';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';
import { DeleteButton , EditButton } from '@/shared/ui';

interface TagCardProps {
  tag: AdminTag;
  onEdit: (tag: AdminTag) => void;
  onDelete: (tag: AdminTag) => void;
  isDeleting: boolean;
}

export function TagCard({ tag, onEdit, onDelete, isDeleting }: TagCardProps) {
  const locale = useLocale();
  const translated = getTranslatedContent(tag.translations, locale);
  const displayName = translated?.name || tag.slug;

  return (
    <div className="group flex items-center justify-between rounded-xl border bg-card p-3 transition-all hover:border-primary/50 hover:shadow-md">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <TagIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          <p className="truncate font-mono text-[10px] uppercase text-muted-foreground">
            {tag.slug}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <EditButton onClick={() => onEdit(tag)} />
        <DeleteButton isSubmitting={isDeleting} onClick={() => onDelete(tag)} />
      </div>
    </div>
  );
}
