import { Skeleton } from '@/shared/ui/skeleton';

export function AboutMeLoading() {
  return (
    <section className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-48 md:h-10 md:w-64" />
      </div>

      {/* RichText Content Skeleton */}
      <div className="pl-0 ml-0.5 space-y-3">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-[95%]" />
        <Skeleton className="h-5 w-[98%]" />
        <Skeleton className="h-5 w-[40%]" />

        {/* Gap between "paragraphs" */}
        <div className="pt-2" />

        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-[85%]" />
      </div>
    </section>
  );
}
