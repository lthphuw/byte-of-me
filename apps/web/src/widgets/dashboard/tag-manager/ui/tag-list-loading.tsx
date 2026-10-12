import { Skeleton } from '@byte-of-me/ui';

/** Stands in for the tag cards of `TagManager` while page 1 loads. Same classes as a card. */
export function TagListLoading() {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-hidden="true"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-xl border bg-card p-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
            <div className="min-w-0 space-y-1">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3.5 w-14" />
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
