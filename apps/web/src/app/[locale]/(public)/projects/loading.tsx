import { Skeleton } from '@byte-of-me/ui';

import { ProjectTimelineItemSkeleton } from '@/entities/project';
import { ProjectsShell } from '@/widgets/public/projects-content/ui';

/**
 * Route-level fallback for /projects.
 *
 * It mirrors what `ProjectsContent` renders while its query is in flight — a
 * `ListPageHeader` above an `<ol>` spine of `ProjectTimelineItemSkeleton`s —
 * and it reuses that same skeleton component rather than approximating it, so
 * the two cannot drift apart the way hand-copied markup does.
 *
 * It previously mocked a three-column card grid, which is not a layout this
 * page has ever rendered: the projects list is a vertical timeline. Navigating
 * here therefore painted a grid and then replaced it wholesale.
 *
 * No container or padding of its own — `ProjectsShell` (`ShellBase`) already
 * owns the page frame and the gap between these children.
 */
export default function ProjectsLoading() {
  return (
    <ProjectsShell>
      {/* Mirrors ListPageHeader: title/subtitle pair, then the filter row,
          over a rule. */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 md:gap-6 md:pb-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56 md:h-12 md:w-72" />
          <Skeleton className="h-5 w-72 md:h-6 md:w-96" />
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
