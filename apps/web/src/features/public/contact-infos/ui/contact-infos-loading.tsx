import { Skeleton } from '@byte-of-me/ui';

export function ContactInfosLoading() {
  return (
    <div className="w-full max-w-md animate-pulse space-y-8 md:space-y-12">
      <div className="space-y-2 text-center">
        <Skeleton className="mx-auto h-10 w-64" />
        <Skeleton className="mx-auto h-4 w-48" />
      </div>
      <div className="space-y-4 md:space-y-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
