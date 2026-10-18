import { Skeleton } from '@byte-of-me/ui';

import { RecordListItem } from '@/shared/ui/record-list';

/** Rows of the admin comment list (`comment-manager.tsx`), in the same item and action slots. */
export function CommentListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: 6 }, (_, index) => (
        <RecordListItem
          key={index}
          className="items-start"
          leading={<Skeleton className="h-8 w-8 rounded-full" />}
          actions={<Skeleton className="h-8 w-20" />}
        >
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </RecordListItem>
      ))}
    </div>
  );
}
