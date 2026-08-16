import { Skeleton } from '@byte-of-me/ui';

export function CommentListSkeleton() {
  return (
    // Same rhythm as `CommentList`, and no top padding it does not have: the
    // skeleton must not move the page when the real list replaces it.
    <div className="space-y-4 md:space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
