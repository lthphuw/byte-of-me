import { Skeleton } from '@/shared/ui/skeleton';

export function HomepageProfileLoading() {
  return (
    <div className="space-y-16 md:space-y-28">
      {/* HERO SECTION SKELETON */}
      <div className="max-w-3xl mx-auto space-y-5 md:space-y-8 text-left">
        {/* GreetingWriter Skeleton */}
        <Skeleton className="h-10 w-48 md:h-14 md:w-80" />
        <div className="space-y-3">
          <Skeleton className="h-5 w-full md:h-6" />
          <Skeleton className="h-5 w-[85%] md:h-6" />
        </div>
      </div>

      {/* ABOUT / MY STORY SKELETON */}
      <div className="grid gap-10 md:gap-14 items-start md:grid-cols-2">
        {/* Left Column (Bio) */}
        <div className="space-y-6 md:space-y-8">
          <div className="space-y-4 md:space-y-5">
            <Skeleton className="h-4 w-28 uppercase tracking-widest" />{' '}
            {/* myStory Label */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[60%]" />
            </div>
          </div>
          <Skeleton className="h-6 w-44" />
        </div>

        {/* Right Column (Quote/Image Placeholder) */}
        <div className="hidden md:block">
          <Skeleton className="aspect-square w-full max-w-[300px] rounded-2xl mx-auto" />
        </div>
      </div>
    </div>
  );
}
