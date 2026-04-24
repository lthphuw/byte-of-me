import { Skeleton } from '@/shared/ui';

export function BlogLiveStatsSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}
