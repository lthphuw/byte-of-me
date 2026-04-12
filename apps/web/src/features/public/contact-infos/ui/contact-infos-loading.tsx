import { Skeleton } from '@/shared/ui/skeleton';

export function ContactInfosLoading() {
  return (
    <div className="w-full max-w-md animate-pulse space-y-8">
      <div className="space-y-3 text-center">
        <Skeleton className="mx-auto h-10 w-64" />
        <Skeleton className="mx-auto h-4 w-48" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
