'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Skeleton } from '@/shared/ui/skeleton';

export interface ProjectFilterSectionProps {
  title: string;
  children: React.ReactNode;
  onLoadMore: () => void;
  hasMore?: boolean;
  isLoading: boolean;
  isFetchingNextPage: boolean;
}

export function ProjectFilterSection({
  title,
  children,
  onLoadMore,
  hasMore,
  isLoading,
  isFetchingNextPage,
}: ProjectFilterSectionProps) {
  const t = useTranslations('components.projectFilters');
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {isLoading && !isFetchingNextPage ? (
          <>
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="w-22 h-6 rounded-full" />
          </>
        ) : (
          children
        )}

        {isFetchingNextPage && (
          <>
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </>
        )}

        {hasMore && !isFetchingNextPage && !isLoading && (
          <button
            onClick={onLoadMore}
            className="inline-flex h-6 items-center gap-1 px-2 text-[11px] font-medium text-primary transition-all hover:underline"
          >
            <Plus className="h-3 w-3" />
            {t('seeMore')}
          </button>
        )}
      </div>
    </div>
  );
}
