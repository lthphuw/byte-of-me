import { Skeleton } from '@byte-of-me/ui';

import { TechStackListLoading } from '@/widgets/dashboard/tech-stack-manager';

/**
 * Route fallback for the Tech Stack manager: the header it renders, then the
 * grouped cards, so the page does not shift when it resolves. Mirrors
 * `ManagerPageHeader` and the manager's list wrapper.
 */
export default function TechStacksLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="relative min-h-[200px]">
        <TechStackListLoading />
      </div>
    </div>
  );
}
