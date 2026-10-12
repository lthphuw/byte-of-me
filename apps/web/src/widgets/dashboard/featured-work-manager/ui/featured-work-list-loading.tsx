import { Skeleton } from '@byte-of-me/ui';

/** Stands in for the featured-work rows of `FeaturedWorkManager` while page 1 loads. Same classes as a row. */
export function FeaturedWorkListLoading() {
  return (
    <div className="grid gap-4" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4"
        >
          <div className="flex min-w-0 items-center gap-4">
            <Skeleton className="h-4 w-6 flex-shrink-0" />
            <div className="min-w-0 space-y-1">
              <Skeleton className="h-4 w-48 max-w-full" />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
