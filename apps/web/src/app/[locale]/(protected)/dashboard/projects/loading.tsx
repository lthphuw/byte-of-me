import { Skeleton } from '@byte-of-me/ui';

import { ProjectListLoading } from '@/widgets/dashboard/project-manager';

/**
 * Route fallback for the Projects manager: the header it renders, then the card
 * grid, so the page does not shift when it resolves. Mirrors `ManagerPageHeader`
 * and the manager's list wrapper.
 */
export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="relative min-h-[200px]">
        <ProjectListLoading />
      </div>
    </div>
  );
}
