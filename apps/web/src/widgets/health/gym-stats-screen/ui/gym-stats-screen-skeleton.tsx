'use client';

import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

/**
 * `GymStatsScreen`, loading.
 *
 * The same frame as the screen it replaces — `max-w-4xl`, `p-4 md:p-8`,
 * `gap-6` — then the back link, the heading, the ratio card, three chart cards
 * and the progression grid in that order, so nothing moves when the read
 * lands. A skeleton whose rhythm differs from the component's causes the shift
 * it exists to prevent (§14).
 */
export function GymStatsScreenSkeleton() {
  const t = useTranslations('dashboard.health.stats');

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-x-clip"
      aria-busy="true"
      aria-label={t('loading')}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          <div className="flex flex-col gap-2">
            <Skeleton aria-hidden className="h-11 w-32 rounded-xl" />
            <Skeleton aria-hidden className="h-7 w-40" />
            <Skeleton aria-hidden className="h-5 w-56" />
          </div>

          <Skeleton aria-hidden className="h-52 w-full rounded-3xl" />
          <Skeleton aria-hidden className="h-56 w-full rounded-3xl" />
          <Skeleton aria-hidden className="h-56 w-full rounded-3xl" />
          <Skeleton aria-hidden className="h-72 w-full rounded-3xl" />

          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton
                key={index}
                aria-hidden
                className="h-64 w-full rounded-3xl"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
