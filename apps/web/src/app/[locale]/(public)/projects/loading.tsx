import { Skeleton } from '@byte-of-me/ui';

import { ProjectTimelineItemSkeleton } from '@/entities/project';
import { ProjectsShell } from '@/widgets/public/projects-content/ui';

/**
 * Route-level fallback for /projects: mirrors `ProjectsContent` (`ListPageHeader` over an `<ol>`
 * timeline of `ProjectTimelineItemSkeleton`s, not a card grid), reusing it so they cannot drift.
 * No container or padding of its own: `ProjectsShell` owns the page frame.
 */
export default function ProjectsLoading() {
  return (
    <ProjectsShell>
      {/* Mirrors ListPageHeader: title/subtitle pair, then the filter row,
          over a rule. */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 md:pb-6">
        {/* Title over the count line. There is no description strapline, so
            the second bar stands in for "8 projects", not a sentence. */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-56 md:h-12 md:w-72" />
          <Skeleton className="h-5 w-24 md:h-6 md:w-28" />
        </div>
        <Skeleton className="h-11 w-full sm:max-w-xs md:h-9" />
      </div>

      <ol className="border-l border-border/60">
        {Array.from({ length: 3 }).map((_, index) => (
          <ProjectTimelineItemSkeleton key={index} />
        ))}
      </ol>
    </ProjectsShell>
  );
}
