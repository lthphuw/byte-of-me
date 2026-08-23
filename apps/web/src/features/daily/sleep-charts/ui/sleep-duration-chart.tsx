'use client';

import { useLocale, useTranslations } from 'next-intl';

import {
  type DayValue,
  toDaySeries,
} from '@/features/daily/sleep-charts/lib/day-series';
import { formatDayWithWeekday } from '@/shared/lib/health/day-label';
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
    formatDayWithWeekday(key, locale)
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
