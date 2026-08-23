'use client';

import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

/**
 * `SleepScreen`, loading.
 *
 * It draws the ENTRY COLUMN, not the statistics: the entry column is the top
 * of the screen (and the left of it at `lg`) and the only part that is always
 * there, while the stats beside it depend on a read that may return nothing at
 * all. A placeholder for tiles that then never appear is a worse lie than a
 * short page — and at `lg` the grid still reserves the column, so the entry
 * side does not jump sideways when the statistics arrive.
 *
 * The bottom bar is in the skeleton for the same reason it is in the hub's: it
 * is where the thumb already is, and a bar that arrives late moves the target
 * out from under it. It disappears at `lg` here exactly as it does there.
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
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-8">
            <div className="flex min-w-0 flex-col gap-6">
              {/* The hero: a 176px ring inside a 32px-padded card, then the
                  delta and the target beneath it. */}
              <div className="flex flex-col items-center gap-5 rounded-3xl border p-8">
                <Skeleton aria-hidden className="size-44 rounded-full" />
                <Skeleton aria-hidden className="h-6 w-40" />
                <Skeleton aria-hidden className="h-4 w-32" />
              </div>

              {/* The two 64px time targets, each under its label, in the card
                  they now share. */}
              <div className="grid grid-cols-2 gap-4 rounded-3xl border p-5">
                <div className="space-y-2">
                  <Skeleton aria-hidden className="h-4 w-20" />
                  <Skeleton aria-hidden className="h-16 w-full rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <Skeleton aria-hidden className="h-4 w-20" />
                  <Skeleton aria-hidden className="h-16 w-full rounded-2xl" />
                </div>
              </div>

              {/* Quality: the header row, then the five 64px icon buttons. */}
              <div className="space-y-3">
                <Skeleton aria-hidden className="h-4 w-24" />
                <Skeleton aria-hidden className="h-16 w-full rounded-2xl" />
              </div>

              {/* The closed details trigger, at the height it has before any
                  detail is filled — two lines plus the efficiency hint, which
                  is exactly what a first visit sees. */}
              <Skeleton
                aria-hidden
                className="h-[5.75rem] w-full rounded-3xl"
              />

              <div className="hidden lg:block">
                <Skeleton aria-hidden className="h-14 w-full rounded-2xl" />
              </div>
            </div>
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
