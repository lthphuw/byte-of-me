import { Skeleton } from '@byte-of-me/ui';

/** Two stat chips in the shape `BlogLiveStats` renders: the same wrap, gaps and icon column. */
export function BlogLiveStatsSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground md:text-base">
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}
