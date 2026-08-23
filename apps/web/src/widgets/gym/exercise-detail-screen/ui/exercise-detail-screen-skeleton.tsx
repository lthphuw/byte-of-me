'use client';

import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

/**
 * `ExerciseDetailScreen`, loading.
 *
 * The same frame as the screen it replaces — `max-w-4xl`, `p-4 md:p-8`,
 * `gap-6` — then the back link, the identity block, the chart card, the two
 * record tiles and the session list in that order, so nothing moves when the
 * read lands (§14).
 */
export function ExerciseDetailScreenSkeleton() {
  const t = useTranslations('dashboard.gym.exerciseDetail');

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-x-clip"
      aria-busy="true"
      aria-label={t('loading')}
    >
      <div className="pb-safe min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          <Skeleton aria-hidden className="h-11 w-40 rounded-xl" />

          <div className="flex flex-col gap-2">
            <Skeleton aria-hidden className="h-7 w-56" />
            <Skeleton aria-hidden className="h-5 w-64" />
          </div>

          <Skeleton aria-hidden className="h-5 w-48" />
          <Skeleton aria-hidden className="h-72 w-full rounded-3xl" />

          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton aria-hidden className="h-32 w-full rounded-2xl" />
            <Skeleton aria-hidden className="h-32 w-full rounded-2xl" />
          </div>

          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton
                key={index}
                aria-hidden
                className="h-40 w-full rounded-2xl"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
