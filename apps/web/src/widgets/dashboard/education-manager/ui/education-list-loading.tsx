import { Skeleton } from '@byte-of-me/ui';

/** Stands in for the education rows of `EducationManager` while page 1 loads. Same classes as a row. */
export function EducationListLoading() {
  return (
    <div className="grid gap-4" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4"
        >
          <div className="flex min-w-0 items-center gap-4">
            <Skeleton className="h-14 w-14 flex-shrink-0 rounded-lg" />
            <div className="min-w-0 space-y-1">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-3 w-44" />
              <div className="flex flex-wrap gap-2 pt-1">
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
