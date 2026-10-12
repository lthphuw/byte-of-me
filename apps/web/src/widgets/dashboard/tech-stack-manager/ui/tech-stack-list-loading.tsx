import { Skeleton } from '@byte-of-me/ui';

/** Stands in for the grouped tech-stack cards of `TechStackManager` while the list loads. Same classes as a group and a card. */
export function TechStackListLoading() {
  return (
    <div
      className="columns-1 gap-6 space-y-6 md:columns-2 lg:columns-3"
      aria-hidden="true"
    >
      {Array.from({ length: 3 }).map((_, group) => (
        <section
          key={group}
          className="break-inside-avoid space-y-3 rounded-xl border bg-card p-4 shadow-sm"
        >
          <Skeleton className="h-4 w-24" />

          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, item) => (
              <div
                key={item}
                className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-3"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="flex gap-1">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
