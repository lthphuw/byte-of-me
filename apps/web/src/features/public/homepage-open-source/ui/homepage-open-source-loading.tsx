import { Skeleton } from '@byte-of-me/ui';

// Mirrors `HomepageOpenSource`: a title row with its link, then a card of repo
// rows whose classes follow `RepoLinkRow` and `RepoSummary`.
export function HomepageOpenSourceLoading() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between md:gap-8">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40 md:h-9 md:w-56" />
          <Skeleton className="h-4 w-56 md:h-5 md:w-72" />
        </div>
        <Skeleton className="h-5 w-40 self-start md:h-6" />
      </div>

      <div className="divide-y overflow-hidden rounded-xl border bg-card">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-4 md:px-5">
            <Skeleton className="mt-0.5 h-7 w-7 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-5 w-48 md:h-6" />
              <Skeleton className="h-4 w-full max-w-md md:h-5" />
              <div className="pt-0.5">
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
