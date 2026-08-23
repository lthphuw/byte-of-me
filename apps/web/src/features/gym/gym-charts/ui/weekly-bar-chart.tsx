'use client';

import { useTranslations } from 'next-intl';

import type { ChartPoint } from '@/shared/ui/chart';
import { BarChart } from '@/shared/ui/chart';

/**
 * A weekly figure over the training window, as bars.
 *
 * A client component even though every screen that mounts it is an RSC, and
 * not only because `BarChart` holds selection state: `formatValue` is a
 * FUNCTION prop, and functions do not cross the server→client boundary.
 * Something on the client has to own it, and this is the smallest thing that
 * can — the screens pass plain points whose labels are already formatted.
 *
 * `unit` rather than two near-identical wrappers, because the only difference
 * between the tonnage chart and the training-load chart is the unit each
 * number is printed with, and two copies of a wrapper is how one of them
 * stops matching `BarChart`.
 *
 * A `null` value is a GAP, not a zero bar: `BarChart` skips it, and a week
 * where no session recorded a session RPE has an unknown load rather than no
 * load. The screen states the count of those weeks beneath the chart.
 */
export function WeeklyBarChart({
  points,
  unit,
  title,
  summary,
  className,
}: {
  points: ChartPoint[];
  unit: 'kg' | 'load';
  title: string;
  summary: string;
  className?: string;
}) {
  const t = useTranslations('dashboard.gym.stats');

  const formatValue = (value: number) =>
    unit === 'kg'
      ? t('kgValue', { value: Math.round(value) })
      : t('loadValue', { value: Math.round(value) });

  return (
    <BarChart
      points={points}
      formatValue={formatValue}
      title={title}
      summary={summary}
      className={className}
    />
  );
}
