import { Skeleton } from '@byte-of-me/ui';

export function HomepageEducationLoading() {
  return (
    <div className="space-y-6 md:space-y-8">
      <Skeleton className="h-7 w-32 md:h-9 md:w-44" />
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 md:gap-4">
            <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
