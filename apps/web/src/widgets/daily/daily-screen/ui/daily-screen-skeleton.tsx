'use client';

import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

/**
 * `DailyScreen`, loading.
 *
 * The calendar card is drawn with the real calendar's ANATOMY, not a generic
 * block — a header of circle / centred label / circle matching the two 44px
 * `MonthStep` buttons either side of the month name, a weekday-initial row,
 * then a grid of day cells that are each a numeral over a 36px disc over the
 * reserved dot row, exactly like `SleepMonthCalendar`'s real button. It used
 * to claim it "mirrors the screen's shape exactly" while actually drawing one
 * full-width pill for the header, no weekday row at all, 42 solid cells (six
 * full weeks — no real month has a leading blank in every row), and a solid
 * rounded-rectangle in place of each cell's numeral/disc/dot stack. None of
 * that reads as a calendar; this does.
 *
 * It still does not compute a real calendar — a skeleton should not pretend
 * to know which month is loading. 4 leading blanks plus 31 day cells (a full
 * month's worth, filling five complete rows with nothing left over) is the
 * neutral shape: enough blanks to show the grid does not always start on a
 * Monday, without asserting a specific one. Each cell keeps the real one's
 * ~4.5rem height so nothing settles when the real grid arrives.
 *
 * Below the calendar, beside it at `lg` and beneath it below that: the error
 * banner's absence, the month summary tiles and the 14-night chart card.
 *
 * No sheet in the skeleton. It opens on a tap, never on load, so there is
 * nothing here for it to reserve.
 */
/** A neutral shape, not a real month: enough leading blanks to show a month
 *  does not always start on the grid's first column, plus a full month's
 *  worth of day cells (31, the maximum any month has) — 35 cells total,
 *  exactly five complete rows, so the placeholder never ends on a ragged
 *  partial row a real short month would. */
const SKELETON_LEADING_BLANKS = 4;
const SKELETON_DAY_CELLS = 31;

export function DailyScreenSkeleton() {
  const t = useTranslations('dashboard.health');

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-x-clip"
      aria-busy="true"
      aria-label={t('loading')}
    >
      <div className="pb-safe min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-8">
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

              <div className="mt-1 flex flex-col gap-2 border-t pt-3">
                <Skeleton aria-hidden className="h-3 w-full max-w-xs" />
                <Skeleton aria-hidden className="h-3 w-48" />
              </div>
            </div>

            {/* The statistics column: the "last night" duration hero, the
                month summary's six tiles, the 14-day stats panel, and the
                duration chart, in the order the screen renders them. */}
            <div className="flex min-w-0 flex-col gap-6">
              {/* The hero card — see `SleepDurationHero` for the real anatomy
                  this mirrors: the outer `rounded-3xl border bg-card p-5
                  shadow` wrapper `DailyScreen` puts around it, then the
                  hero's own `p-8` card holding a centred 176px ring with a
                  label above it, and below the ring a delta line and a
                  target line. */}
              <div className="rounded-3xl border bg-card p-5 shadow">
                <div className="rounded-3xl border bg-card p-8 shadow">
                  <div className="flex flex-col items-center gap-5">
                    <Skeleton aria-hidden className="size-44 rounded-full" />
                    <div className="flex flex-col items-center gap-1.5">
                      <Skeleton aria-hidden className="h-4 w-32" />
                      <Skeleton aria-hidden className="h-3 w-40" />
                    </div>
                  </div>
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

              <Skeleton aria-hidden className="h-56 w-full rounded-3xl" />

              <Skeleton aria-hidden className="h-52 w-full rounded-3xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
