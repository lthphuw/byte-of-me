import { Skeleton } from '@byte-of-me/ui';

export function BlogCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />

      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Meta line */}
        <Skeleton className="h-3 w-48" />

        {/* Title */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/5" />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>

        {/* Tags */}
        <div className="mt-auto flex gap-1.5 pt-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
