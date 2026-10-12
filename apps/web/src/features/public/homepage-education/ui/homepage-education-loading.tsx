import { Skeleton } from '@byte-of-me/ui';

// Mirrors `HomepageEducation`: one card per school, with the card, padding and
// icon box of `EducationItem`. Its achievements are not drawn, so the card is shorter.
export function HomepageEducationLoading() {
  return (
    <div className="space-y-6 md:space-y-8">
      <Skeleton className="h-7 w-32 md:h-9 md:w-44" />
      <div className="space-y-4 md:space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-start gap-3 p-4 md:gap-4 md:p-5">
              <Skeleton className="h-11 w-11 shrink-0 rounded-lg md:h-12 md:w-12" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-5 w-56 md:h-6" />
                <Skeleton className="h-4 w-40 md:h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
