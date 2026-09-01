'use client';

import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

/**
 * `DailyScreen`, loading — the same order the real screen renders in: the
 * raster card, the fortnight tiles, coverage and the insight cards first, the
 * month calendar and its six tiles in the second column.
 *
 * The calendar is drawn with the real calendar's ANATOMY rather than as a
 * generic block, so nothing settles when the real grid arrives. No sheet: it
 * opens on a tap, never on load.
 */
/** A neutral shape, not a real month: enough leading blanks to show a month
 *  does not always start on the grid's first column, plus a full month's
 *  worth of day cells (31, the maximum any month has) — 35 cells total,
 *  exactly five complete rows, so the placeholder never ends on a ragged
 *  partial row a real short month would. */
const SKELETON_LEADING_BLANKS = 4;
const SKELETON_DAY_CELLS = 31;

export function DailyScreenSkeleton() {
  const t = useTranslations('dashboard.daily');

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-x-clip"
      aria-busy="true"
      aria-label={t('loading')}
    >
      <div className="pb-safe min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-8">
            <div className="flex min-w-0 flex-col gap-6">
              {/* The raster card: last night's figure over fourteen 16px
                  rows and the clock axis under them. */}
              <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow">
                <div className="flex flex-col gap-1.5">
                  <Skeleton aria-hidden className="h-3 w-20" />
                  <Skeleton aria-hidden className="h-8 w-32" />
                  <Skeleton aria-hidden className="h-3 w-40" />
                </div>
                <Skeleton aria-hidden className="h-3 w-36" />
                <Skeleton aria-hidden className="h-[14rem] w-full rounded-lg" />
              </div>

              {/* The fortnight's two tiles, then the six regularity ones. */}
              <div className="flex flex-col gap-2">
                <Skeleton aria-hidden className="h-4 w-32" />
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 2 }, (_, i) => (
                    <Skeleton
                      key={i}
                      aria-hidden
                      className="h-24 w-full rounded-2xl"
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Skeleton aria-hidden className="h-4 w-28" />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton
                      key={i}
                      aria-hidden
                      className="h-24 w-full rounded-2xl"
                    />
                  ))}
                </div>
              </div>

              {/* Coverage: one tile holding a 7×5 grid of day marks. */}
              <div className="flex flex-col gap-2">
                <Skeleton aria-hidden className="h-4 w-32" />
                <Skeleton aria-hidden className="h-56 w-full rounded-2xl" />
              </div>

              {/* The insight panel: a heading over the weekly review, the
                  mood buckets and the factor contrasts, at the `rounded-2xl`
                  its three cards actually wear. */}
              <div className="flex flex-col gap-3">
                <Skeleton aria-hidden className="h-4 w-44" />
                <Skeleton aria-hidden className="h-64 w-full rounded-2xl" />
                <Skeleton aria-hidden className="h-48 w-full rounded-2xl" />
                <Skeleton aria-hidden className="h-40 w-full rounded-2xl" />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-6">
            {/* The calendar card — see `SleepMonthCalendar` for the real
                anatomy this mirrors. */}
            <div className="flex flex-col gap-3 rounded-3xl border bg-card p-5 shadow">
              {/* Header: circle, centred label, circle — the two 44px
                  `MonthStep` buttons either side of the month name. */}
              <div className="flex items-center justify-between gap-2">
                <Skeleton aria-hidden className="size-11 shrink-0 rounded-full" />
                <Skeleton aria-hidden className="h-5 w-36 rounded-full" />
                <Skeleton aria-hidden className="size-11 shrink-0 rounded-full" />
              </div>

              {/* The weekday-initial row, absent from the real grid below it
                  entirely before this existed — the grid landed one row
                  higher than the real calendar draws it. */}
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }, (_, i) => (
                  <Skeleton
                    key={i}
                    aria-hidden
                    className="h-3 w-3 justify-self-center rounded-full"
                  />
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: SKELETON_LEADING_BLANKS }, (_, i) => (
                  <span key={`blank-${i}`} aria-hidden />
                ))}

                {Array.from({ length: SKELETON_DAY_CELLS }, (_, i) => (
                  // One day cell: a numeral over a 36px disc over the
                  // reserved dot row, at the real cell's ~4.5rem height — not
                  // a solid rectangle, which reads as an input, not a day.
                  <div
                    key={i}
                    aria-hidden
                    className="flex h-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1.5"
                  >
                    <Skeleton aria-hidden className="h-[11px] w-4 rounded-full" />
                    <Skeleton
                      aria-hidden
                      className="aspect-square w-full max-w-9 rounded-full"
                    />
                    <span aria-hidden className="h-1.5" />
                  </div>
                ))}
              </div>

            </div>

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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
