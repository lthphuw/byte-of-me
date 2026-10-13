'use client';

import type { ReactNode } from 'react';
import { Button } from '@byte-of-me/ui';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { useMediaInfiniteQuery } from '@/entities/media/query';
import { MediaPickerSkeleton } from '@/features/dashboard/media-library/ui/media-picker-skeleton';
import { QueryState } from '@/shared/ui/query-state';

type LibraryQuery = Pick<
  ReturnType<typeof useMediaInfiniteQuery>,
  | 'isLoading'
  | 'isError'
  | 'refetch'
  | 'hasNextPage'
  | 'fetchNextPage'
  | 'isFetchingNextPage'
>;

export interface MediaPickerGridProps {
  query: LibraryQuery;
  /** True when the loaded pages hold no image to offer. */
  isEmpty: boolean;
  children: ReactNode;
}

/** The thumbnail grid both pickers share, with its loading, error and empty states. */
export function MediaPickerGrid({
  query,
  isEmpty,
  children,
}: MediaPickerGridProps) {
  const t = useTranslations('dashboard.media');
  const tShared = useTranslations('dashboard.shared');

  return (
    <QueryState
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => void query.refetch()}
      isEmpty={isEmpty && !query.hasNextPage}
      skeleton={<MediaPickerSkeleton />}
      errorTitle={tShared('managerListState.errorTitle')}
      errorDescription={tShared('managerListState.errorDescription')}
      retryLabel={tShared('managerListState.retry')}
      emptyTitle={t('empty.title')}
      emptyDescription={t('empty.description')}
    >
      <div className="grid grid-cols-4 gap-2">{children}</div>
      {query.hasNextPage && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-4 min-h-11 w-full can-hover:min-h-9"
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t('picker.loadMore')
          )}
        </Button>
      )}
    </QueryState>
  );
}
