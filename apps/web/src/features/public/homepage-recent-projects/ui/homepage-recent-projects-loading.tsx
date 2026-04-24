import { Skeleton } from '@/shared/ui';

export function HomepageRecentProjectsLoading() {
  return (
    <div className="space-y-8 md:space-y-12">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:gap-4">
        <div className="space-y-1 md:space-y-2">
          <Skeleton className="h-7 w-48 md:h-9 md:w-64" /> {/* Title */}
          <Skeleton className="h-4 w-32 md:w-40" /> {/* Subtitle */}
        </div>
        <Skeleton className="h-6 w-24" /> {/* View All Link */}
      </div>

      {/* Projects Grid Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="space-y-4 rounded-xl border p-4">
            <Skeleton className="aspect-video w-full rounded-lg" />{' '}
            {/* PublicProject Image */}
            <div className="space-y-2">
              <Skeleton className="h-5 w-2/3" /> {/* PublicProject Title */}
              <Skeleton className="h-4 w-full" />{' '}
              {/* PublicProject Description */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
