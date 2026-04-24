import { Card , Skeleton } from '@/shared/ui';

export function RelatedProjectCardSkeleton({ label }: { label?: string }) {
  return (
    <div className="related-project w-full">
      {label && <Skeleton className="mb-3 h-4 w-24" />}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="mt-3 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[80%]" />
        </div>
      </Card>
    </div>
  );
}
