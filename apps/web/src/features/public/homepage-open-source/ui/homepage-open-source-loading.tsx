import { Skeleton } from '@byte-of-me/ui';

// Mirrors `HomepageOpenSource` in Compact: the title and summary beside a column of link and
// switch, then a card of repo rows whose classes follow `RepoRow` and `RepoSummary`.
export function HomepageOpenSourceLoading() {
  return (
    <div className="space-y-5 md:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between md:gap-8">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40 md:h-9 md:w-56" />
          <Skeleton className="h-4 w-56 md:h-5 md:w-72" />
        </div>
        <div className="flex items-center justify-between sm:flex-col sm:items-end">
          <Skeleton className="h-5 w-32 md:mt-1.5 md:h-6" />
          <Skeleton className="h-7 w-[76px] rounded-lg" />
        </div>
      </div>

      <div className="divide-y overflow-hidden rounded-xl border bg-card">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-6 md:px-5"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Skeleton className="mt-0.5 h-7 w-7 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-5 w-48 md:h-6" />
                <div className="pt-0.5">
                  <Skeleton className="h-4 w-full max-w-md md:h-5" />
                </div>
                <div className="mt-1">
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </div>
            {/* The two slim buttons, 26px at every width. */}
            <div className="flex items-center gap-2 pl-10 md:shrink-0 md:pl-0">
              <Skeleton className="h-[26px] w-28" />
              <Skeleton className="h-[26px] w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
