import { Skeleton } from '@byte-of-me/ui';

// Mirrors `HomepageEducation` in Compact: the heading beside the switch, then one row per school
// with the logo box, padding and gap of `EducationItem`.
export function HomepageEducationLoading() {
  return (
    <div className="space-y-5 md:space-y-8">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-7 w-32 md:h-9 md:w-44" />
        <Skeleton className="h-7 w-[76px] rounded-lg" />
      </div>

      <div className="divide-y overflow-hidden rounded-xl border bg-card">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3 md:gap-4 md:px-5"
          >
            <Skeleton className="size-9 shrink-0 rounded-lg md:size-10" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-56 md:h-[22px]" />
              <Skeleton className="mt-1 h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
