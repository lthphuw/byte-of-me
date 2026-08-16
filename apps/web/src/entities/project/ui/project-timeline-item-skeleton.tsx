import { Skeleton } from '@byte-of-me/ui';

export function ProjectTimelineItemSkeleton() {
  return (
    <li className="relative pb-8 pl-8 last:pb-0 md:pb-12">
      <span
        aria-hidden
        className="absolute left-0 top-2 size-2.5 -translate-x-1/2 rounded-full border border-border bg-background ring-4 ring-background"
      />

      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-36 shrink-0" />
        </div>

        <div className="max-w-2xl space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        <div className="flex gap-2 pt-1">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
    </li>
  );
}
