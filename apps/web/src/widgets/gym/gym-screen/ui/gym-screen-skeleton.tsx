'use client';

import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

/**
 * `GymScreen`, loading.
 *
 * The same frame as the screen it replaces — `max-w-4xl`, `p-4 md:p-8`,
 * `gap-6` — then the start card, the two sub-links, and the history list in
 * that order, so nothing on the page moves when the four reads land. A
 * skeleton whose rhythm differs from the component's causes the shift it
 * exists to prevent (§14).
 *
 * The start card is drawn at the height of its START shape, not its resume
 * shape, because a first visit and most later ones have no session open. The
 * two are close enough in height that guessing wrong costs a few pixels.
 */
export function GymScreenSkeleton() {
  const t = useTranslations('dashboard.gym');

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-x-clip"
      aria-busy="true"
      aria-label={t('loading')}
    >
      <div className="pb-safe min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          <Skeleton aria-hidden className="h-64 w-full rounded-3xl" />

          <div className="grid grid-cols-2 gap-3">
            <Skeleton aria-hidden className="h-14 w-full rounded-2xl" />
            <Skeleton aria-hidden className="h-14 w-full rounded-2xl" />
          </div>

          <div className="flex flex-col gap-4">
            <Skeleton aria-hidden className="h-7 w-28" />

            <div className="flex gap-2">
              <Skeleton aria-hidden className="h-11 w-24 rounded-2xl" />
              <Skeleton aria-hidden className="h-11 w-24 rounded-2xl" />
              <Skeleton aria-hidden className="h-11 w-20 rounded-2xl" />
            </div>

            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={index}
                  aria-hidden
                  className="h-24 w-full rounded-2xl"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
