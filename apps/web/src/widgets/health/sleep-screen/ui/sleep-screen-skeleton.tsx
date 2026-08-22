'use client';

import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

/**
 * `SleepScreen`, loading.
 *
 * It draws the FORM, not the statistics: the form is the top of the screen and
 * the only part that is always there, while the stats below it depend on a
 * read that may return nothing at all. A placeholder for tiles that then never
 * appear is a worse lie than a short page.
 *
 * The bottom bar is in the skeleton for the same reason it is in the hub's: it
 * is where the thumb already is, and a bar that arrives late moves the target
 * out from under it.
 */
export function SleepScreenSkeleton() {
  const t = useTranslations('dashboard.health');

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-x-clip"
      aria-busy="true"
      aria-label={t('loading')}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
          {/* The two 64px time targets, each under its label. */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Skeleton aria-hidden className="h-4 w-20" />
              <Skeleton aria-hidden className="h-16 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton aria-hidden className="h-4 w-20" />
              <Skeleton aria-hidden className="h-16 w-full" />
            </div>
          </div>

          <Skeleton aria-hidden className="h-5 w-40" />

          <div className="space-y-2">
            <Skeleton aria-hidden className="h-4 w-16" />
            <Skeleton aria-hidden className="h-12 w-full" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Skeleton aria-hidden className="h-4 w-28" />
              <Skeleton aria-hidden className="h-11 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton aria-hidden className="h-4 w-28" />
              <Skeleton aria-hidden className="h-11 w-full" />
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton aria-hidden className="h-4 w-16" />
            <Skeleton aria-hidden className="h-[92px] w-full" />
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto w-full max-w-2xl">
          <Skeleton aria-hidden className="h-14 w-full" />
        </div>
      </div>
    </div>
  );
}
