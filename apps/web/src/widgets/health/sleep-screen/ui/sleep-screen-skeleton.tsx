'use client';

import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

/**
 * `SleepScreen`, loading.
 *
 * It mirrors the screen's shape exactly: the calendar card first — the header
 * row, five weeks of marks with their reserved dot row, and the ruled-off key
 * under them — then, beside it at `lg` and beneath it below that, the error
 * banner's absence, the month summary tiles and the 14-night chart card. A day
 * cell is not square — it is a numeral over a 36px disc plus the dot row,
 * inside 12px of padding, ~72px tall — and a square placeholder made the grid
 * settle upward when the real one arrived.
 *
 * No sheet in the skeleton. It opens on a tap, never on load, so there is
 * nothing here for it to reserve.
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
            {/* The calendar card. */}
            <div className="flex flex-col gap-3 rounded-3xl border bg-card p-5 shadow">
              <Skeleton aria-hidden className="h-11 w-full rounded-full" />

              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 42 }, (_, i) => (
                  <Skeleton
                    key={i}
                    aria-hidden
                    className="h-[4.5rem] w-full rounded-2xl"
                  />
                ))}
              </div>

              <div className="mt-1 flex flex-col gap-2 border-t pt-3">
                <Skeleton aria-hidden className="h-3 w-full max-w-xs" />
                <Skeleton aria-hidden className="h-3 w-48" />
              </div>
            </div>

            {/* The statistics column: the month summary's six tiles, the
                14-day stats panel, and the duration chart, in the order the
                screen renders them. */}
            <div className="flex min-w-0 flex-col gap-6">
              <div className="flex flex-col gap-2">
                <Skeleton aria-hidden className="h-4 w-40" />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton
                      key={i}
                      aria-hidden
                      className="h-20 w-full rounded-2xl"
                    />
                  ))}
                </div>
              </div>

              <Skeleton aria-hidden className="h-56 w-full rounded-3xl" />

              <Skeleton aria-hidden className="h-52 w-full rounded-3xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
