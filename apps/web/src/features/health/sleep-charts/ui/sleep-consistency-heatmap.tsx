'use client';

import { useLocale, useTranslations } from 'next-intl';

import { formatDayLabel } from './sleep-duration-chart';

import {
  type DayValue,
  toDaySeries,
} from '@/features/health/sleep-charts/lib/day-series';
import { splitMinutes } from '@/shared/lib/health/duration';
import { CalendarHeatmap } from '@/shared/ui/chart';

/**
 * Which days were logged at all, shaded by how long the night was.
 *
 * `CalendarHeatmap` lays its points out column-major over seven rows, so the
 * series must begin on the first day of a week or every column becomes a
 * rolling seven days rather than a calendar one — `startKey` comes from
 * `startOfWeek`, and the screen fetches from the same day so no cell claims a
 * night was missed that was simply outside the query.
 *
 * A client component for the same reason the bar chart is one: `formatValue`
 * cannot cross the server→client boundary.
 */
export function SleepConsistencyHeatmap({
  nights,
  startKey,
  days,
  className,
}: {
  nights: DayValue[];
  /** `YYYY-MM-DD` of the top-left cell. Must be a week start. */
  startKey: string;
  days: number;
  className?: string;
}) {
  const t = useTranslations('dashboard.health');
  const locale = useLocale();

  const points = toDaySeries(nights, startKey, days, (key) =>
    formatDayLabel(key, locale)
  );

  return (
    <CalendarHeatmap
      points={points}
      formatValue={(value) => t('units.hoursMinutes', splitMinutes(value))}
      title={t('sleep.heatmap')}
      summary={t('sleep.heatmapSummary')}
      className={className}
    />
  );
}
