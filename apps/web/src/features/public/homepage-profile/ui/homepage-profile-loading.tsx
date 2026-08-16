import { Skeleton } from '@byte-of-me/ui';

/**
 * The root spacing must stay in step with `HomepageProfile`, which this stands
 * in for. It read `space-y-16 md:space-y-28` (64/112px) against the real
 * component's `space-y-8 md:space-y-12` (32/48px), so the hero and the story
 * block sat more than twice as far apart while loading and the page visibly
 * jumped upward the moment the profile resolved. Every other class in this file
 * already mirrors its counterpart; this root was the outlier, and
 * `md:space-y-28` was a value used nowhere else in the app.
 */
export function HomepageProfileLoading() {
  return (
    <div className="space-y-8 md:space-y-12">
      {/* HERO SECTION SKELETON */}
      <div className="mx-auto max-w-3xl space-y-4 text-left md:space-y-6">
        {/* GreetingWriter Skeleton */}
        <Skeleton className="h-10 w-48 md:h-14 md:w-80" />
        <div className="space-y-3">
          <Skeleton className="h-5 w-full md:h-6" />
          <Skeleton className="h-5 w-[85%] md:h-6" />
        </div>
      </div>

      {/* ABOUT / MY STORY SKELETON */}
      <div className="grid items-start gap-6 md:grid-cols-2 md:gap-10">
        {/* Left Column (Bio) */}
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-2">
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
          <Skeleton className="mx-auto aspect-square w-full max-w-[300px] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
