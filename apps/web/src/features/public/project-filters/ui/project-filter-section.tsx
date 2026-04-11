import { Skeleton } from '@/shared/ui/skeleton';
import { Plus } from 'lucide-react';

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
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        {title}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {isLoading && !isFetchingNextPage ? (
          <>
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-22 rounded-full" />
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
            className="inline-flex items-center gap-1 px-2 h-6 text-[11px] font-medium text-primary hover:underline transition-all"
          >
            <Plus className="w-3 h-3" />
            See more
          </button>
        )}
      </div>
    </div>
  );
}
