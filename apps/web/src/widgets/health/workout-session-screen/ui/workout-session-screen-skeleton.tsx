'use client';

import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

/**
 * `WorkoutSessionScreen`, loading.
 *
 * The editor's own frame classes, its back link, its header card and two
 * exercise cards — the shape a session started from a routine has before its
 * sets are entered. The pinned Finish bar is drawn too, for the reason the
 * sleep skeleton draws its save bar: it is where the thumb already is, and a
 * bar that arrives late moves the target out from under it.
 */
export function WorkoutSessionScreenSkeleton() {
  const t = useTranslations('dashboard.health');

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-x-clip"
      aria-busy="true"
      aria-label={t('loading')}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          <Skeleton aria-hidden className="h-11 w-32" />

          <Skeleton aria-hidden className="h-44 w-full rounded-3xl" />

          <div className="flex flex-col gap-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton
                key={index}
                aria-hidden
                className="h-56 w-full rounded-3xl"
              />
            ))}
          </div>

          <Skeleton aria-hidden className="h-12 w-full rounded-2xl" />

          <div className="hidden lg:block">
            <Skeleton aria-hidden className="h-14 w-full rounded-2xl" />
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <div className="mx-auto w-full max-w-4xl">
          <Skeleton aria-hidden className="h-14 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
