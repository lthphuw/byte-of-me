import { Skeleton } from '@byte-of-me/ui';

export function HomepageOpenSourceLoading() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40 md:h-9 md:w-56" />
        <Skeleton className="h-4 w-56 md:w-72" />
      </div>

      <div className="divide-y overflow-hidden rounded-xl border">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-4 md:px-5">
            <Skeleton className="h-7 w-7 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
