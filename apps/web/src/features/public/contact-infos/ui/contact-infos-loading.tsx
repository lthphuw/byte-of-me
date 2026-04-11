import { Skeleton } from '@/shared/ui/skeleton';

export function ContactInfosLoading() {
  return (
    <div className="w-full max-w-md space-y-8 animate-pulse">
      <div className="text-center space-y-3">
        <Skeleton className="h-10 w-64 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
