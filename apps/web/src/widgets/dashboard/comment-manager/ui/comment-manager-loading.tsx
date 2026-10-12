import { Skeleton } from '@byte-of-me/ui';

import { CommentListSkeleton } from '@/widgets/dashboard/comment-manager/ui/comment-list-skeleton';

/** The whole comments page while its route loads: header, then the thread list. */
export function CommentManagerLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
      </div>
      <div className="relative min-h-[300px]">
        <CommentListSkeleton />
      </div>
    </div>
  );
}
