import { Skeleton } from '@byte-of-me/ui';

/** Mirrors `SpaceHub`'s layout so the swap-in does not shift content. */
export function SpaceHubSkeleton() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto" aria-hidden>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-[72px] w-full" />
          <Skeleton className="h-[72px] w-full" />
          <Skeleton className="h-[72px] w-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
