import { Skeleton } from '@byte-of-me/ui';

export function DashboardProfileLoading() {
  return (
    <div className="flex flex-col gap-2">
      {/* The h1 line, sized to text-3xl / md:text-4xl */}
      <Skeleton className="h-9 w-64 md:h-10 md:w-80" />

      {/* The text-lg line */}
      <Skeleton className="h-7 w-full max-w-[450px]" />
    </div>
  );
}
