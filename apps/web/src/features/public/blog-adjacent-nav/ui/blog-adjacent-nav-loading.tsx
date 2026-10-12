import { Skeleton } from '@byte-of-me/ui';

/** Previous and next cards while they load, in the grid and card shape `BlogAdjacentNav` renders. */
export function BlogAdjacentNavSkeleton() {
  return (
    <nav className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-10">
      <div className="flex flex-col gap-2 rounded-xl border p-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-3/4" />
      </div>
      <div className="flex flex-col items-end gap-2 rounded-xl border p-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-3/4" />
      </div>
    </nav>
  );
}
