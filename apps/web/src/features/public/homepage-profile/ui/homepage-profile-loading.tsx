import { Skeleton } from '@byte-of-me/ui';

/**
 * The root spacing must stay in step with `HomepageProfile` (`space-y-5 md:space-y-8`, 24/32px):
 * the old `space-y-16 md:space-y-28` (64/112px) made the page jump upward when the profile
 * resolved.
 */
export function HomepageProfileLoading() {
  return (
    <div className="space-y-5 md:space-y-8">
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
      <div className="grid items-start gap-4 md:grid-cols-2 md:gap-8">
        {/* Left Column (Bio) */}
        <div className="space-y-3 md:space-y-6">
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

        {/* Right Column (the quote card: below the bio on a phone, beside it from md) */}
        <div className="flex justify-center md:justify-end">
          <Skeleton className="h-40 w-full rounded-xl md:aspect-square md:h-auto md:max-w-[300px]" />
        </div>
      </div>
    </div>
  );
}
