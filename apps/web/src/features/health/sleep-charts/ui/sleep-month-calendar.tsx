'use client';

import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import {
  daysInMonth,
  mondayIndex,
} from '@/features/health/sleep-charts/lib/day-series';
import { Link } from '@/shared/i18n/navigation';
import { splitMinutes } from '@/shared/lib/health/duration';
import { addDays, localDateKey } from '@/shared/lib/health/local-date';
import { cn } from '@/shared/lib/utils';
import { MONTH_CALENDAR_FILL } from '@/shared/ui/chart';

/**
 * Where the four shades change, as fractions of the nightly target.
 *
 * Against the TARGET rather than against the window's own maximum, which is
 * what the heatmap this replaced did. A relative scale re-shades the whole
 * month every time one long night is logged, so the same 6h night is pale in
 * one week and mid-grey in another — the mark moved without the night moving.
 * Against a fixed goal, a shade means the same thing in January as in August.
 *
 * At the 8h default these are: under 6h, 6h–7h12m, 7h12m–8h, and 8h or more.
 */
const BAND_EDGES = [0.75, 0.9, 1] as const;

/** A Monday, for naming the seven columns. Any Monday does; this one is
 *  1 January 2024, and it is formatted in UTC like every other date key in
 *  this module. */
const WEEKDAY_ANCHOR_MS = Date.UTC(2024, 0, 1);

const DAY_MS = 86_400_000;

/** One night as the grid needs it: how long it was, and how it felt. The
 *  caller resolves the glyph, so this slice never has to know what a quality
 *  rating looks like. */
export interface CalendarNight {
  /** `YYYY-MM-DD`, the same key `localDateKey` produces. */
  localDate: string;
  /** Minutes asleep. `null` is a night that was never logged — never `0`,
   *  which would claim a night of no sleep. */
  value: number | null;
  /** The quality glyph and the word it stands for, when the night was rated. */
  quality: { icon: LucideIcon; label: string } | null;
}

/**
 * The month, as the screen's primary surface: one tappable mark per night.
 *
 * **It is a control now, not a drawing.** It used to be a `MonthCalendar`
 * inside `ChartFrame`, whose children are wrapped in `aria-hidden` because the
 * accessible equivalent of a picture is the `sr-only` table beside it. That is
 * exactly right for a bar chart and exactly wrong for a grid of buttons: a
 * focusable control inside an `aria-hidden` subtree is reachable by keyboard
 * and invisible to the reader using it, which is the `aria-hidden-focus`
 * failure. So the marks are real buttons and each one carries its own full
 * accessible name — the date, the duration, the quality, and whether it is
 * today. Those names ARE the non-visual equivalent, and they say strictly more
 * than the table did because the table had one value column and this has
 * three.
 *
 * **Two axes, no redundancy.** The shade is how LONG the night was, banded
 * against the owner's nightly target through `MONTH_CALENDAR_FILL` — a ramp
 * whose four alphas were measured in CIE L* rather than picked as a tidy
 * 25/50/75/100, and importing it is what keeps that measurement in one place.
 * The glyph inside the mark is how the night FELT: the same five-step quality
 * ramp the entry form uses, so a picture means the same thing on both halves
 * of the screen. A night with no quality rating simply has no glyph, which is
 * honest — inventing one would put a claim on the grid nobody made.
 *
 * **Six states, and none of them touches the mark.** The disc already carries
 * two values — a shade for how long, a glyph for how it felt — so every
 * interaction cue is spent on the two surfaces that carry no data: the CELL
 * PLATE behind the whole button, and the NUMERAL above the disc. That is the
 * rule that generates the set:
 *
 * | State | Plate | Numeral | Mark |
 * | --- | --- | --- | --- |
 * | rest | none | `muted-foreground` | shade or hollow ring |
 * | hover | `bg-muted/70` | lifts to `foreground` | untouched |
 * | focus-visible | none | — | 2px `ring` round the cell, offset 2 |
 * | pressed | `bg-muted` | — | whole cell scales to 94% |
 * | selected | `bg-muted` | INVERTED pill, semibold | untouched |
 * | today | none | — | 2px `foreground` ring round the disc |
 *
 * Selection inverts because a tint does not exist here: every token is 0%
 * saturation (§14), so `bg-muted` at 96.1% against a 100% card is a 4-point
 * step and hover would be indistinguishable from selected if the plate were
 * the only cue. The pill is the cue that survives — near-black on near-white
 * or the reverse, at both themes — and it sits on the numeral rather than
 * behind the disc precisely so it cannot be read as a duration.
 *
 * Hover is AFFORDANCE ONLY. Touch has no hover, so nothing above is knowable
 * from it alone: selection is also `aria-pressed` and a bold inverted pill,
 * today is also `aria-current="date"` and a ring, and both are in the button's
 * accessible name. The press is a transform rather than a third tone, because
 * a finger covers the cell it is pressing and only a size change escapes from
 * under it; `motion-reduce` opts out of the scale and keeps the plate.
 *
 * **Target size.** Seven columns inside a 20px-padded card on a 375px phone
 * leaves ~36px per cell; 44px is arithmetically impossible there and no
 * calendar on any platform manages it. The button fills its whole cell and the
 * 8px grid gap is undisturbed, which is the WCAG 2.5.8 spacing allowance: a
 * 36px target with 8px of clear space on every side behaves as a 44px one.
 */
export function SleepMonthCalendar({
  nights,
  monthStartKey,
  todayKey,
  targetMin,
  selectedKey,
  onSelect,
  prevMonthKey,
  nextMonthKey,
  className,
}: {
  nights: CalendarNight[];
  /** `YYYY-MM-DD` of the 1st of the month being drawn. */
  monthStartKey: string;
  /** `YYYY-MM-DD` of the reader's today, so "future" and the ring are decided
   *  against the reader's calendar rather than the last logged row. */
  todayKey: string;
  /** The scale the shades band against. Never printed here, so a fallback is a
   *  drawing decision and not a claim — the caller passes one. */
  targetMin: number;
  /** `YYYY-MM-DD` of the day the form is editing. */
  selectedKey: string;
  onSelect: (key: string) => void;
  /** `YYYY-MM` of the month before this one. */
  prevMonthKey: string;
  /** `YYYY-MM` of the month after, or `null` when this is the current month —
   *  there are no nights in the future to page into. */
  nextMonthKey: string | null;
  className?: string;
}) {
  const t = useTranslations('dashboard.health');
  const locale = useLocale();

  const monthStart = new Date(`${monthStartKey}T00:00:00.000Z`);
  const dayCount = daysInMonth(monthStart);
  const byDay = new Map(nights.map((night) => [night.localDate, night]));

  const dayFormat = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });

  const weekdayFormat = new Intl.DateTimeFormat(locale, {
    weekday: 'narrow',
    timeZone: 'UTC',
  });
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    weekdayFormat.format(new Date(WEEKDAY_ANCHOR_MS + i * DAY_MS))
  );

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(monthStart);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* The month is in the URL, not in React state. That was the whole
          objection to arrows the first time round — a window the server read
          cannot see forces either a refetch per arrow or a pre-read of months
          nobody opens. A search param is read by the page, so the read is
          SIZED by the month on screen, the back button pages through months,
          and a month is linkable. Selecting a day inside the month stays
          client state, because every row for the visible month is already
          here. */}
      <div className="flex items-center justify-between gap-2">
        <MonthStep
          monthKey={prevMonthKey}
          label={t('sleep.prevMonth')}
          icon={ChevronLeft}
        />

        {/* `base/semibold`, not `sm/medium`. This card is the first thing on
            the screen and the control everything under it is about, so its
            title has to outrank the `sm` headings in the column below rather
            than match them — on a palette with no hue, type scale and weight
            are the whole hierarchy (§14). */}
        <h2 className="min-w-0 flex-1 truncate text-center text-base font-semibold tracking-tight">
          {monthLabel}
        </h2>

        <MonthStep
          monthKey={nextMonthKey}
          label={t('sleep.nextMonth')}
          icon={ChevronRight}
        />
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekdays.map((weekday, i) => (
          <span
            key={i}
            aria-hidden
            className="text-center text-[11px] font-medium leading-none text-muted-foreground"
          >
            {weekday}
          </span>
        ))}
      </div>

      {/* `role="group"` rather than `radiogroup`: these are buttons that load
          a day into the form, and a day stays loaded — there is no "none"
          state a radio group would need a gesture for. */}
      <div
        role="group"
        aria-label={t('sleep.selectDay')}
        className="grid grid-cols-7 gap-2"
      >
        {Array.from({ length: mondayIndex(monthStart) }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}

        {Array.from({ length: dayCount }, (_, i) => {
          const date = addDays(monthStart, i);
          const key = localDateKey(date);
          const night = byDay.get(key) ?? null;
          const isToday = key === todayKey;
          const isFuture = key > todayKey;
          const isSelected = key === selectedKey;
          const Icon = night?.quality?.icon ?? null;

          // Everything the mark says, said in words. A reader who cannot see
          // the shade or the glyph gets the duration and the quality from the
          // button's own name rather than from a table somewhere else.
          const parts = [dayFormat.format(date)];
          if (!isFuture) {
            parts.push(
              night?.value == null
                ? t('sleep.calendarMissed')
                : t('units.hoursMinutes', splitMinutes(night.value))
            );
          }
          if (night?.quality) parts.push(night.quality.label);
          if (isToday) parts.push(t('sleep.today'));

          return (
            <button
              key={key}
              type="button"
              disabled={isFuture}
              aria-pressed={isFuture ? undefined : isSelected}
              // Not `aria-selected`, which is only defined on a handful of
              // roles and on none of the ones a plain button can carry.
              aria-current={isToday ? 'date' : undefined}
              aria-label={parts.join(' — ')}
              onClick={() => onSelect(key)}
              className={cn(
                'group flex w-full flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1.5',
                'transition-[background-color,transform] duration-200 ease-out motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                // The pressed state is the plate at full strength AND a 6%
                // shrink. Under a fingertip the plate is invisible — the
                // finger is on top of it — so the size change is the half of
                // the press that a phone can actually perceive.
                isFuture
                  ? 'cursor-default'
                  : 'hover:bg-muted/70 active:scale-[0.94] active:bg-muted motion-reduce:active:scale-100',
                isSelected && 'bg-muted'
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[11px] leading-none tabular-nums',
                  'transition-colors duration-200 motion-reduce:transition-none',
                  isSelected
                    ? 'bg-primary font-semibold text-primary-foreground'
                    : cn(
                        'text-muted-foreground',
                        !isFuture && 'group-hover:text-foreground'
                      )
                )}
              >
                {date.getUTCDate()}
              </span>

              {isFuture ? (
                // A pip, not a hollow ring: a day that has not happened has
                // nothing to have missed, and the ring means "missed".
                <span
                  aria-hidden
                  className="flex aspect-square w-full max-w-9 items-center justify-center"
                >
                  <span className="size-1.5 rounded-full bg-muted-foreground/25" />
                </span>
              ) : (
                <span
                  aria-hidden
                  className={cn(
                    'flex aspect-square w-full max-w-9 items-center justify-center rounded-full',
                    night?.value == null
                      ? 'border-2 border-muted-foreground/35 text-muted-foreground'
                      : markClass(night.value, targetMin),
                    isToday &&
                      'ring-2 ring-foreground ring-offset-1 ring-offset-card'
                  )}
                >
                  {/* 20px inside a 36px disc, not 16px. The glyphs are FACES
                      now, and a face is told from the next face by the curve
                      of one stroke: at 16px in a single tone the mouth of a
                      Frown and the mouth of a Meh are the same two pixels.
                      This is the same reason the entry scale draws them at
                      32px — the mark has to survive as a silhouette, because
                      the tone it is drawn in is already spent on duration. */}
                  {Icon ? <Icon className="size-5 shrink-0" /> : null}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* A key, not a hover tooltip: touch has no hover, so a scale that only
          exists on hover does not exist on the device this is built for.
          Ruled off and given its own line rather than run on under the grid —
          three clauses of 11px text abutting five rows of marks read as a
          sixth row of marks, which is how the key came to be skipped. The
          swatch clauses come first because they name what the grid draws, and
          the sentence about the glyph last because it is a sentence. */}
      <div className="mt-1 flex flex-col gap-2 border-t pt-3 text-[11px] leading-normal text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="flex items-center gap-1.5">
            {t('sleep.calendarShorter')}
            <span aria-hidden className="flex items-center gap-1">
              {MONTH_CALENDAR_FILL.map((fill) => (
                <span
                  key={fill}
                  className={cn('size-3 shrink-0 rounded-full', fill)}
                />
              ))}
            </span>
            {t('sleep.calendarLonger')}
          </span>

          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full border-2 border-muted-foreground/35"
            />
            {t('sleep.calendarMissed')}
          </span>

          {/* Today is in the key for the same reason the ramp is: it is a
              ring on one mark out of thirty and nothing else on the screen
              says what a ring means. */}
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full bg-primary/55 ring-2 ring-foreground ring-offset-1 ring-offset-card"
            />
            {t('sleep.today')}
          </span>
        </div>

        <span>{t('sleep.calendarQualityKey')}</span>
      </div>
    </div>
  );
}

/**
 * One month step, as a link.
 *
 * `null` renders a DISABLED button rather than nothing, so the header keeps
 * its shape at the current month and the month label does not slide sideways
 * on the one screen a reader lands on most.
 */
function MonthStep({
  monthKey,
  label,
  icon: Icon,
}: {
  monthKey: string | null;
  label: string;
  icon: LucideIcon;
}) {
  // The same press the day cells get, so the two controls in this card behave
  // as one family: a plate on hover, a 5% shrink while held, both inside the
  // 150–300ms band (§14).
  const className =
    'flex size-11 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-200 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card';

  if (monthKey === null) {
    return (
      <button
        type="button"
        disabled
        aria-label={label}
        className={cn(className, 'text-muted-foreground/40')}
      >
        <Icon aria-hidden className="size-5" />
      </button>
    );
  }

  return (
    <Link
      href={{ pathname: '/space/health/sleep', query: { month: monthKey } }}
      scroll={false}
      aria-label={label}
      className={cn(
        className,
        'text-muted-foreground hover:bg-muted hover:text-foreground',
        'active:scale-95 active:bg-muted motion-reduce:active:scale-100'
      )}
    >
      <Icon aria-hidden className="size-5" />
    </Link>
  );
}

/** Which fill step a night falls in, as a class. Clamped at both ends, so a
 *  14-hour night is the darkest mark rather than an index off the end of the
 *  ramp.
 *
 *  The glyph inside inherits `currentColor`, so each band also names the tone
 *  that reads on it: the two pale steps keep `--foreground`, and the two dark
 *  ones flip to `--primary-foreground` exactly as the quality scale's selected
 *  button does. Both pairings hold in both themes, because `--primary` and its
 *  foreground swap together. */
function markClass(value: number, targetMin: number): string {
  const fraction = value / targetMin;
  const band = Math.min(
    BAND_EDGES.filter((edge) => fraction >= edge).length,
    MONTH_CALENDAR_FILL.length - 1
  );

  return cn(
    MONTH_CALENDAR_FILL[band],
    band < 2 ? 'text-foreground' : 'text-primary-foreground'
  );
}
