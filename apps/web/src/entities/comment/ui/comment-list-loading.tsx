import { Skeleton } from '@byte-of-me/ui';

/**
 * Three placeholder comments in the shape `CommentList` renders: the same
 * rhythm, the same avatar column and the same header, body and action rows.
 * No top padding, so the page does not move when the real list replaces it.
 */
export function CommentListSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="grid grid-cols-[auto_1fr] gap-x-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex min-w-0 items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>

            <div className="col-span-2 mt-2 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>

            <div className="col-span-2 mt-2 flex items-center gap-2">
              <Skeleton className="h-6 w-14" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
