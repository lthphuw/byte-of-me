'use client';

import { DeleteButton , EditButton } from '@byte-of-me/ui';
import { Tag as TagIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import type { AdminTag } from '@/entities/tag';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';

interface TagCardProps {
  tag: AdminTag;
  onEdit: (tag: AdminTag) => void;
  onDelete: (tag: AdminTag) => void;
  isDeleting: boolean;
}

export function TagCard({ tag, onEdit, onDelete, isDeleting }: TagCardProps) {
  const locale = useLocale();
  const t = useTranslations('dashboard.shared');
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

      {/* Hover-revealed only from `sm`: touch has no hover, so `opacity-0`
          left both actions invisible but tappable. `focus-within` covers the
          keyboard path. */}
      <div className="flex shrink-0 gap-1 transition-opacity sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100">
        <EditButton
          label={t('actions.editItem', { name: displayName })}
          onClick={() => onEdit(tag)}
        />
        <DeleteButton
          isSubmitting={isDeleting}
          label={t('actions.deleteItem', { name: displayName })}
          onClick={() => onDelete(tag)}
        />
      </div>
    </div>
  );
}
