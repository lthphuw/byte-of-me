import { Skeleton } from '@/shared/ui/skeleton';

export function AboutEducationLoading() {
  return (
    <section className="space-y-8">
      {/* "PublicEducation" Title */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-40 md:h-10 md:w-56" />
      </div>

      <div className="space-y-12 pl-0">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-4">
            {/* School Header: Logo + Name/Date */}
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-full shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>

            {/* GPA & Thesis Stats */}
            <div className="space-y-2 pt-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-40" />
            </div>

            {/* Description Paragraph */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
            </div>

            {/* Event/Workshop Title */}
            <div className="pt-2">
              <Skeleton className="h-6 w-56 mb-2" />
              <Skeleton className="h-4 w-72" />
            </div>

            {/* Images/Carousel Skeleton */}
            <div className="flex gap-4 overflow-hidden">
              <Skeleton className="h-48 w-full max-w-[320px] rounded-xl shrink-0" />
              {/* Secondary image visible on PC/larger screens */}
              <Skeleton className="hidden md:block h-48 w-[200px] rounded-xl shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
