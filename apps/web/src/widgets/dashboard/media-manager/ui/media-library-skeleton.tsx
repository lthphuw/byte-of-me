import { Skeleton } from '@byte-of-me/ui';

/**
 * The loaded library (`media-library.tsx`): the same grid and pager footer, with
 * placeholder cells, so the swap does not move the page.
 */
export function MediaLibrarySkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }, (_, index) => (
          <Skeleton key={index} className="aspect-square" />
        ))}
      </div>
      <div className="flex items-center justify-between border-t pt-4">
        <Skeleton className="h-4 w-24" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}
