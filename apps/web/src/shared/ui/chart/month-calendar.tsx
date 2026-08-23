import { ChartFrame, type ChartPoint } from './chart-frame';

import { cn } from '@/shared/lib/utils';

/**
 * The four fill steps, in ascending value order.
 *
 * These alphas are MEASURED, not a linear ramp. A tidy 25/50/75/100 looks even
 * as numbers and is not even as light: sRGB is gamma-encoded, so equal alpha
 * steps bunch up at the dark end and spread at the light end, and the two
 * lightest dots end up closer together than any other pair.
 *
 * Composited over `--card` and converted to CIE L*, these four land at
 * roughly 75 / 53 / 34 / 8 in the light theme and 35 / 59 / 77 / 98 in the
 * dark one — steps of 19–27 L* everywhere, against a ~10 L* floor for
 * confident discrimination. The lightest step also has to separate from the
 * sheet it sits on: 75 against the card's 100 is a 25-point gap, so an unlit
 * short night still reads as a mark rather than as nothing.
 *
 * `--primary` rather than a hardcoded grey, so one ramp is correct in both
 * themes — it is near-black in light and near-white in dark, and the card
 * behind it flips with it.
 *
 * Exported because the sleep screen's month grid is a control rather than a
 * drawing and therefore cannot sit inside `ChartFrame` (a focusable button in
 * an `aria-hidden` subtree is the `aria-hidden-focus` failure). It draws the
 * same marks against the same ramp, and a second copy of these four alphas
 * would be a second copy of the measurement that produced them.
 */
export const MONTH_CALENDAR_FILL = [
  'bg-primary/30',
  'bg-primary/55',
  'bg-primary/75',
  'bg-primary',
] as const;

const FILL = MONTH_CALENDAR_FILL;

export const MONTH_CALENDAR_LEVELS = FILL.length;

export interface MonthCalendarDay {
  /** Accessible row header for this day. Also the React key — must be unique. */
  label: string;
  /** The day's value; `null` when nothing was recorded. */
  value: number | null;
  /** Which fill step, `0` (lowest) to `MONTH_CALENDAR_LEVELS - 1`. Ignored
   *  when `value` is `null`. */
  level: number;
  isToday: boolean;
  /** The day has not happened yet, so there is nothing to have missed. */
  isFuture: boolean;
}

/**
 * A calendar month as a grid of filled circles.
 *
 * This replaced a 91-day GitHub-style square heatmap. The squares were a
 * rolling window with no landmarks in it: no reader knows where the 14th of
 * the month is in a run of thirteen anonymous columns, so "I slept badly the
 * week I was travelling" was not a question the mark could answer. A calendar
 * month is the unit a person actually remembers in, and one screenful of it
 * reads at a glance.
 *
 * **What carries the value.** Shade, and only shade — see `FILL`. Everything
 * else on the grid is a shape distinction rather than a tone one, because
 * tone is already spent: a day with no row is a HOLLOW ring (a hole, not a
 * pale fill, so it cannot be mistaken for a short night), a day still in the
 * future is a small centred pip, and today wears a `ring` in `--foreground`
 * over a gap. None of the four is a hue, and none of them is the only carrier
 * of its meaning — the accessible table beneath spells every day out.
 *
 * **No `<title>` inside a mark.** React 19 hoists `<title>` as document
 * metadata, which mismatched on every cell of the old heatmap and forced a
 * client re-render of the whole subtree. That is also why the visual is plain
 * elements rather than an SVG: `ring` and `border` are one class each here and
 * a stroke-and-offset calculation there, and nothing about a month grid needs
 * a viewBox. The non-visual equivalent is `ChartFrame`'s `sr-only` table.
 *
 * Days are laid out Monday-first; `leadingBlanks` is how many cells the 1st is
 * offset by, which only the caller can know because only the caller knows the
 * month.
 */
export function MonthCalendar({
  days,
  leadingBlanks,
  weekdays,
  formatValue,
  title,
  summary,
  legend,
  className,
}: {
  days: MonthCalendarDay[];
  /** Empty cells before the 1st, 0–6. */
  leadingBlanks: number;
  /** Seven localized weekday initials, starting on Monday. */
  weekdays: string[];
  formatValue: (value: number) => string;
  title: string;
  summary: string;
  /**
   * The words for the key beneath the grid — the swatches are drawn here,
   * beside the ramp they explain, so `FILL` never has to leave this file.
   *
   * A key rather than a hover tooltip, and the same reason as everywhere else
   * in this module: touch has no hover, so a scale that only exists on hover
   * does not exist on the device this is built for.
   */
  legend: { missed: string; shorter: string; longer: string };
  className?: string;
}) {
  // Days that have not happened yet are left out of the table rather than
  // printed as "—", which is what a MISSED night reads as. A reader hearing
  // thirty-one dashes in a row on the 3rd of the month would take it as a
  // month of failure instead of a month that has barely started.
  const rows: ChartPoint[] = days
    .filter((day) => !day.isFuture)
    .map((day) => ({ label: day.label, value: day.value }));

  return (
    <ChartFrame
      title={title}
      summary={summary}
      rows={rows}
      valueLabel={title}
      formatValue={formatValue}
      footer={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full border-2 border-muted-foreground/35"
            />
            {legend.missed}
          </span>

          <span className="flex items-center gap-1.5">
            {legend.shorter}
            <span aria-hidden className="flex items-center gap-1">
              {FILL.map((fill) => (
                <span
                  key={fill}
                  className={cn('size-3 shrink-0 rounded-full', fill)}
                />
              ))}
            </span>
            {legend.longer}
          </span>
        </div>
      }
      className={className}
    >
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-7 gap-2">
          {weekdays.map((weekday, i) => (
            <span
              key={i}
              className="text-center text-[11px] font-medium leading-none text-muted-foreground"
            >
              {weekday}
            </span>
          ))}
        </div>

        {/* `gap-2` is 8px, and today's `ring-2 ring-offset-1` reaches 3px past
            its dot — so the marked day never touches the one beside it. */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}

          {days.map((day) => (
            <span key={day.label} className="flex items-center justify-center">
              {day.isFuture ? (
                <span className="size-1.5 rounded-full bg-muted-foreground/25" />
              ) : (
                <span
                  className={cn(
                    'aspect-square w-full max-w-10 rounded-full',
                    day.value === null
                      ? 'border-2 border-muted-foreground/35'
                      : FILL[Math.min(day.level, FILL.length - 1)],
                    day.isToday &&
                      'ring-2 ring-foreground ring-offset-1 ring-offset-card'
                  )}
                />
              )}
            </span>
          ))}
        </div>
      </div>
    </ChartFrame>
  );
}
