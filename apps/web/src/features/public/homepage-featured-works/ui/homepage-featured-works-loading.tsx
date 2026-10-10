import { Skeleton } from '@byte-of-me/ui';

import { PLAIN_ROW_HEADER } from '@/entities/featured-work/ui/featured-work-row-classes';

export function HomepageFeaturedWorksLoading() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40 md:h-9 md:w-56" />
        <Skeleton className="h-4 w-56 md:w-72" />
      </div>

      <div className="divide-y rounded-xl border bg-card px-4 md:px-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={PLAIN_ROW_HEADER}
          >
            <Skeleton className="mt-1 h-4 w-5" />
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-6 w-48 md:h-7" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
            <div className="col-start-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 md:col-start-3 md:flex-col md:items-end md:text-right">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
