'use client';

import { useTranslations } from 'next-intl';

import { MediaCard } from '@/entities/media';
import { cn } from '@/shared/lib/utils';
import type { Media } from '@/shared/types/models';

export function MediaLibrary({
  mediaList,
  isPlaceholderData,
  onDelete,
  deletingId,
}: {
  mediaList: Media[];
  isPlaceholderData: boolean;
  onDelete: (media: Media) => void;
  /** The one id whose deletion is in flight — not a global "a delete is running". */
  deletingId?: string | null;
}) {
  const t = useTranslations('dashboard.shared.crud');
  const tCopy = useTranslations('components.copyButton');

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 transition-opacity duration-200',
        isPlaceholderData && 'opacity-50'
      )}
    >
      {mediaList.map((item) => (
        <MediaCard
          key={item.id}
          media={item}
          onDeleteMedia={() => onDelete(item)}
          isDeleting={deletingId === item.id}
          deleteLabel={t('deleteItem', { name: item.fileName })}
          copyLabel={tCopy('copy')}
          copiedLabel={tCopy('copied')}
        />
      ))}
    </div>
  );
}
