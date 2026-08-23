'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/utils';
import { ChartFrame } from '@/shared/ui/chart';

const VIEW_W = 320;
const VIEW_H = 120;
/** Room for a marker at the very first or very last point. Without it a dot on
 *  the edge overflows `ChartFrame`'s `overflow-x-auto` box and gives the chart
 *  a scrollbar over five pixels of nothing. */
const PAD_X = 8;
const PAD_Y = 12;

export interface E1rmChartPoint {
  /** Already formatted for the reader's locale — see `lib/day-label.ts`. */
  label: string;
  valueKg: number;
  /** Beat every earlier point in the window. */
  isRecord: boolean;
}

/**
 * Estimated one-rep max over time, with every record marked.
 *
 * **The markers are HTML positioned over the SVG, not SVG shapes.** The path
 * is drawn with `preserveAspectRatio="none"` so it fills whatever width the
 * card gives it, and under that scaling a `<circle>` becomes an ellipse whose
 * eccentricity depends on the viewport. Absolutely-positioned elements take
 * their percentages from the same box and stay round at every width, which
 * also makes a record markable by SHAPE — a ringed dot against a plain one —
 * rather than by a colour this palette does not have.
 *
 * The record dates are additionally listed in words beneath the chart, and the
 * selected point renders ABOVE it. Nothing here lives in a hover state: there
 * is no hover on a phone, and a value that exists only on hover does not exist
 * (§14). Tapping the plot selects the nearest session.
 *
 * Every point in `points` is a RELIABLE estimate — `e1rmSeries` drops
 * everything above the reliable rep ceiling before this component sees it —
 * so a marker can never sit on an estimate that was not allowed to be a
 * record. `unreliableNote` is how the sessions that were dropped are still
 * accounted for, because a bare gap in a line says "you did not train", which
 * is a different claim from "the estimate is not trustworthy".
 */
export function E1rmChart({
  points,
  title,
  summary,
  unreliableNote,
  className,
}: {
  points: E1rmChartPoint[];
  title: string;
  summary: string;
  unreliableNote?: string;
  className?: string;
}) {
  const t = useTranslations('dashboard.health.stats');
  const [selected, setSelected] = useState<number | null>(null);

  const formatKg = (value: number) =>
    t('kgValue', { value: Math.round(value * 10) / 10 });

  const values = points.map((point) => point.valueKg);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, max);
  const span = max - min || 1;

  const xOf = (index: number) =>
    points.length <= 1
      ? VIEW_W / 2
      : PAD_X + (index / (points.length - 1)) * (VIEW_W - 2 * PAD_X);
  const yOf = (value: number) =>
    max === min
      ? VIEW_H / 2
      : PAD_Y + (1 - (value - min) / span) * (VIEW_H - 2 * PAD_Y);

  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${xOf(index)} ${yOf(point.valueKg)}`
    )
    .join(' ');

  const active = selected === null ? null : points[selected];
  const records = points.filter((point) => point.isRecord);

  return (
    <ChartFrame
      title={title}
      summary={summary}
      rows={points.map((point) => ({
        // The record marker has to reach the accessible table too: it is the
        // one thing on this chart that is carried by a shape.
        label: point.isRecord
          ? t('recordRow', { day: point.label })
          : point.label,
        value: point.valueKg,
      }))}
      valueLabel={t('e1rmColumn')}
      formatValue={formatKg}
      className={className}
      footer={
        <div className="flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground">
          <p>
            {records.length === 0
              ? t('noRecordsInWindow')
              : t('recordsLegend', {
                  days: records.map((point) => point.label).join(' · '),
                })}
          </p>
          {unreliableNote ? <p>{unreliableNote}</p> : null}
        </div>
      }
    >
      <p className="mb-1 h-5 text-sm font-medium tabular-nums">
        {active ? `${active.label} · ${formatKg(active.valueKg)}` : ''}
      </p>

      <div
        className="relative h-28 w-full touch-pan-y"
        onPointerDown={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientX - rect.left) / rect.width;
          const viewX = ratio * VIEW_W;
          // Nearest by x in viewBox units, so the hit test uses the same
          // mapping the marks were drawn with.
          let nearest = 0;
          points.forEach((_, index) => {
            if (Math.abs(xOf(index) - viewX) < Math.abs(xOf(nearest) - viewX)) {
              nearest = index;
            }
          });
          setSelected(nearest);
        }}
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          {points.length > 1 ? (
            <path
              d={path}
              fill="none"
              className="stroke-primary"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>

        {points.map((point, index) => (
          <span
            key={point.label}
            className={cn(
              'absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary',
              point.isRecord
                ? 'size-2.5 outline outline-2 outline-offset-2 outline-border'
                : 'size-1.5',
              selected === index &&
                'outline outline-2 outline-offset-2 outline-primary'
            )}
            style={{
              left: `${(xOf(index) / VIEW_W) * 100}%`,
              top: `${(yOf(point.valueKg) / VIEW_H) * 100}%`,
            }}
          />
        ))}
      </div>
    </ChartFrame>
  );
}
