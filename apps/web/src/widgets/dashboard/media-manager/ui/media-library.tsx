'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Pagination } from '@byte-of-me/ui';

import { MediaCard } from '@/entities/media';
import { cn } from '@/shared/lib/utils';
import type { PaginatedMetadata } from '@/shared/types/api/paginated-api.type';
import type { Media } from '@/shared/types/models';

export function MediaLibrary({
  mediaList,
  pagination,
  isPlaceholderData,
  setPage,
  remove,
  isRemoving,
}: {
  mediaList: Media[];
  pagination?: PaginatedMetadata;
  isPlaceholderData: boolean;
  setPage: Dispatch<SetStateAction<number>>;
  remove: (id: string) => void;
  isRemoving: boolean;
}) {
  return (
    <div className="space-y-4">
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
            onDeleteMedia={(id) => remove(id)}
            isDeleting={isRemoving}
          />
        ))}
      </div>

      <Pagination
        pagination={pagination}
        setPage={setPage}
        isPlaceholderData={isPlaceholderData}
      />
    </div>
  );
}
