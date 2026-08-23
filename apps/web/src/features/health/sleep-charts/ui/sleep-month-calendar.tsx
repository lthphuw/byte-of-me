'use client';

import { useLocale, useTranslations } from 'next-intl';

import { formatDayLabel } from './sleep-duration-chart';

import {
  daysInMonth,
  type DayValue,
  mondayIndex,
  toDaySeries,
} from '@/features/health/sleep-charts/lib/day-series';
import { splitMinutes } from '@/shared/lib/health/duration';
import { addDays, localDateKey } from '@/shared/lib/health/local-date';
import {
  MONTH_CALENDAR_LEVELS,
  MonthCalendar,
  type MonthCalendarDay,
} from '@/shared/ui/chart';

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

/**
 * The current month, one filled circle per night.
 *
 * The circle's shade is how long that night was, banded against the owner's
 * nightly target (`BAND_EDGES`); an unlogged day past is a hollow ring; a day
 * still to come is a pip; today wears a ring. Nothing here is a hue, because
 * there is no hue on this palette to spend (AGENTS §14) — the reference this
 * follows carries the value in colour and this cannot, so the value moved into
 * shade and every OTHER state moved out of tone entirely and into shape.
 *
 * **One month, no navigation.** A back/forward pair would make the grid's
 * window a piece of client state that the server read cannot see, so either
 * the screen refetches on every arrow — a round trip to redraw thirty dots —
 * or it pre-reads months nobody opens. The screen's read is already sized by
 * two other consumers (the 14-day bar chart and the median that seeds the
 * form's defaults), and a month is the unit the entry flow is about: what the
 * reader wants from this mark is "how is this month going", which one month
 * answers completely.
 *
 * A client component for the same reason the bar chart is one: `formatValue`
 * is a FUNCTION prop and functions do not cross the server→client boundary.
 */
export function SleepMonthCalendar({
  nights,
  monthStartKey,
  todayKey,
  targetMin,
  className,
}: {
  nights: DayValue[];
  /** `YYYY-MM-DD` of the 1st of the month being drawn. */
  monthStartKey: string;
  /** `YYYY-MM-DD` of the reader's today, so "future" and the ring are decided
   *  against the reader's calendar rather than the last logged row. */
  todayKey: string;
  /** The scale the shades band against. Never printed, so a fallback here is
   *  a drawing decision and not a claim — the caller passes one. */
  targetMin: number;
  className?: string;
}) {
  const t = useTranslations('dashboard.health');
  const locale = useLocale();

  const monthStart = new Date(`${monthStartKey}T00:00:00.000Z`);
  const dayCount = daysInMonth(monthStart);

  // `toDaySeries` rather than mapping the rows: a missed night has to occupy
  // its own cell, and `null` — not `0` — is what keeps "nothing recorded"
  // apart from "a night of no sleep".
  const points = toDaySeries(nights, monthStartKey, dayCount, (key) =>
    formatDayLabel(key, locale)
  );

  const days: MonthCalendarDay[] = points.map((point, i) => {
    const key = localDateKey(addDays(monthStart, i));
    const isToday = key === todayKey;

    return {
      // The ring says "today" on screen; this says it to a screen reader,
      // which is the same rule the whole module runs on — no state may be
      // carried by the drawing alone.
      label: isToday ? `${point.label} — ${t('sleep.today')}` : point.label,
      value: point.value,
      level: bandOf(point.value, targetMin),
      isToday,
      isFuture: key > todayKey,
    };
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
    timeZone: 'UTC',
  }).format(monthStart);

  return (
    <MonthCalendar
      days={days}
      leadingBlanks={mondayIndex(monthStart)}
      weekdays={weekdays}
      formatValue={(value) => t('units.hoursMinutes', splitMinutes(value))}
      title={t('sleep.calendar', { month: monthLabel })}
      summary={t('sleep.calendarSummary')}
      legend={{
        missed: t('sleep.calendarMissed'),
        shorter: t('sleep.calendarShorter'),
        longer: t('sleep.calendarLonger'),
      }}
      className={className}
    />
  );
}

/** Which fill step a night falls in. Clamped at both ends, so a 14-hour night
 *  is the darkest dot rather than an index off the end of the ramp. */
function bandOf(value: number | null, targetMin: number): number {
  if (value === null) return 0;

  const fraction = value / targetMin;
  const band = BAND_EDGES.filter((edge) => fraction >= edge).length;

  return Math.min(band, MONTH_CALENDAR_LEVELS - 1);
}
