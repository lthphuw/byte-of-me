import { Skeleton } from '@/shared/ui';

export function DashboardProfileLoading() {
  return (
    <div className="flex flex-col gap-3">
      {/* Skeleton for the heading */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-64 md:h-10 md:w-80" />
        <Skeleton className="h-8 w-8 rounded-full" />{' '}
        {/* Wave icon placeholder */}
      </div>

      {/* Skeleton for the subheading */}
      <Skeleton className="h-6 w-full max-w-[450px]" />
    </div>
  );
}
