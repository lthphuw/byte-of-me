import { Skeleton } from '@byte-of-me/ui';

import { MediaLibrarySkeleton } from '@/widgets/dashboard/media-manager/ui/media-library-skeleton';

/** The whole media page while its route loads: header, actions, then the library. */
export function MediaManagerLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <div className="relative min-h-[300px]">
        <MediaLibrarySkeleton />
      </div>
    </div>
  );
}
