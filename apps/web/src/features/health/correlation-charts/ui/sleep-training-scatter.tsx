'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { splitMinutes } from '@/shared/lib/health/duration';
import { cn } from '@/shared/lib/utils';
import { ChartFrame } from '@/shared/ui/chart';

/** Inset, as a percentage of the plot box, so a mark on the extreme of either
 *  axis is not half outside it. Six percent of a 320px card is ~19px, which
 *  clears the 10px marks with room for their selected ring. */
const PAD = 6;

export interface ScatterPoint {
  /** `YYYY-MM-DD`, used only as a React key. */
  key: string;
  /** The day, already formatted for the reader's locale. */
  label: string;
  /** The predictor: minutes asleep the night before. */
  sleepMin: number;
  /** The outcome: tonnage, or mean working-set RPE. */
  value: number;
}

/**
 * One night's sleep against what the training that followed it produced.
 *
 * **One series, so there is no categorical encoding to get wrong** — and the
 * marks are still drawn as open rings rather than filled dots, for two
 * reasons that both matter on this palette. Overlapping observations stay
 * countable through each other, which a filled dot destroys; and selection can
 * then INVERT the mark (outline becomes fill) rather than tint it, which is
 * the only state change available at 0% saturation. Nothing here is encoded by
 * hue, and nothing is encoded by colour alone.
 *
 * **The selected day's numbers render above the plot, never in a tooltip.**
 * There is no hover on a phone, and a tooltip anchored to the tap point sits
 * under the finger that summoned it. Both axes print their own extremes
 * beneath and beside the box, so a mark's position is readable without
 * tapping it at all.
 *
 * The coefficient itself is NOT drawn here. It belongs beside the sample size
 * and the causation caveat, which are the screen's business — a ρ printed on a
 * chart reads as a property of the picture rather than as a claim that needs
 * its n.
 */
export function SleepTrainingScatter({
  points,
  unit,
  title,
  summary,
  className,
}: {
  points: ScatterPoint[];
  unit: 'kg' | 'rpe';
  title: string;
  summary: string;
  className?: string;
}) {
  const t = useTranslations('dashboard.health.correlation');
  const tUnits = useTranslations('dashboard.health');
  const [selected, setSelected] = useState<number | null>(null);

  const formatSleep = (minutes: number) =>
    tUnits('units.hoursMinutes', splitMinutes(minutes));
  const formatValue = (value: number) =>
    unit === 'kg'
      ? t('kgValue', { value: Math.round(value) })
      : t('rpeValue', { value: Math.round(value * 10) / 10 });

  const xs = points.map((point) => point.sleepMin);
  const ys = points.map((point) => point.value);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;

  const leftPct = (point: ScatterPoint) =>
    PAD + ((point.sleepMin - xMin) / xSpan) * (100 - 2 * PAD);
  const topPct = (point: ScatterPoint) =>
    PAD + (1 - (point.value - yMin) / ySpan) * (100 - 2 * PAD);

  const active = selected === null ? null : points[selected];

  return (
    <ChartFrame
      title={title}
      summary={summary}
      rows={points.map((point) => ({
        // The x value has to reach the accessible table too: a row that
        // reported only the tonnage would drop the predictor the whole chart
        // is about.
        label: `${point.label} · ${formatSleep(point.sleepMin)}`,
        value: point.value,
      }))}
      valueLabel={title}
      formatValue={formatValue}
      className={className}
      footer={
        <p className="text-xs text-muted-foreground">
          {t('axisLegend', {
            xLow: formatSleep(xMin),
            xHigh: formatSleep(xMax),
            yLow: formatValue(yMin),
            yHigh: formatValue(yMax),
          })}
        </p>
      }
    >
      <p className="mb-1 h-5 text-sm font-medium tabular-nums">
        {active
          ? `${active.label} · ${formatSleep(active.sleepMin)} → ${formatValue(
              active.value
            )}`
          : ''}
      </p>

      <div
        className="relative h-40 w-full touch-pan-y rounded-sm border bg-muted/30"
        onPointerDown={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const px = ((event.clientX - rect.left) / rect.width) * 100;
          const py = ((event.clientY - rect.top) / rect.height) * 100;

          let nearest = 0;
          let best = Number.POSITIVE_INFINITY;
          points.forEach((point, index) => {
            const dx = leftPct(point) - px;
            const dy = topPct(point) - py;
            const distance = dx * dx + dy * dy;
            if (distance < best) {
              best = distance;
              nearest = index;
            }
          });
          setSelected(nearest);
        }}
      >
        {points.map((point, index) => (
          <span
            key={point.key}
            className={cn(
              'absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border',
              // Selection INVERTS. A tint would be invisible at 0%
              // saturation, which is why the ring fills instead.
              selected === index
                ? 'border-primary bg-primary'
                : 'border-foreground/70 bg-background'
            )}
            style={{
              left: `${leftPct(point)}%`,
              top: `${topPct(point)}%`,
            }}
          />
        ))}
      </div>
    </ChartFrame>
  );
}
