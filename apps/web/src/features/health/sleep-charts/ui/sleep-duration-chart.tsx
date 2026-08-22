'use client';

import { useLocale, useTranslations } from 'next-intl';

import {
  type DayValue,
  toDaySeries,
} from '@/features/health/sleep-charts/lib/day-series';
import { splitMinutes } from '@/shared/lib/health/duration';
import { BarChart } from '@/shared/ui/chart';

/**
 * Nightly sleep over a short window, as bars against the target line.
 *
 * A client component even though both screens that mount it are RSCs, and not
 * only because `BarChart` holds selection state: `formatValue` is a FUNCTION
 * prop, and functions do not cross the server→client boundary. Something on
 * the client has to own it, and this is the smallest thing that can — the
 * screens pass plain data.
 *
 * It also owns the calendar padding, because the window is the chart's own
 * business: a screen asking for "the last 14 days" should not have to know
 * that a missed night must still occupy a column.
 */
export function SleepDurationChart({
  nights,
  startKey,
  days,
  targetMin,
  className,
}: {
  nights: DayValue[];
  /** `YYYY-MM-DD` of the first column. */
  startKey: string;
  days: number;
  /** Omitted when the target could not be read; the chart then draws no
   *  reference line rather than one at zero. */
  targetMin?: number;
  className?: string;
}) {
  const t = useTranslations('dashboard.health');
  const locale = useLocale();

  const points = toDaySeries(nights, startKey, days, (key) =>
    formatDayLabel(key, locale)
  );

  return (
    <BarChart
      points={points}
      targetValue={targetMin}
      formatValue={(value) => t('units.hoursMinutes', splitMinutes(value))}
      title={t('sleep.durationChart')}
      summary={t('sleep.durationSummary')}
      className={className}
    />
  );
}

/**
 * `timeZone: 'UTC'` is not a detail to tidy away. A `localDate` key is stored
 * and passed around as UTC midnight (see `local-date.ts`), so formatting it in
 * the reader's zone would render the 22nd as the 21st for anyone west of
 * Greenwich — the one bug the whole convention exists to avoid.
 */
export function formatDayLabel(key: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${key}T00:00:00.000Z`));
}
