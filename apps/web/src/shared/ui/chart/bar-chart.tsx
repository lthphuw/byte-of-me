'use client';

import { useState } from 'react';

import { ChartFrame, type ChartPoint } from './chart-frame';

import { cn } from '@/shared/lib/utils';

const VIEW_W = 320;
const VIEW_H = 120;
const GAP = 2;

/**
 * Bars over a short window, with an optional target line.
 *
 * The selected value renders ABOVE the chart, not in a floating tooltip: there
 * is no hover on a touch screen, and a tooltip anchored to the tap point is
 * underneath the finger that summoned it.
 *
 * `viewBox` + `width: 100%` rather than measuring the container: the chart is
 * pure ratio, so it scales without a resize observer and without a layout pass.
 */
export function BarChart({
  points,
  targetValue,
  formatValue,
  title,
  summary,
  className,
}: {
  points: ChartPoint[];
  targetValue?: number;
  formatValue: (value: number) => string;
  title: string;
  summary: string;
  className?: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  const max = Math.max(targetValue ?? 0, ...points.map((p) => p.value ?? 0), 1);
  const barW = Math.max(1, VIEW_W / Math.max(points.length, 1) - GAP);
  const active = selected !== null ? points[selected] : null;

  return (
    <ChartFrame
      title={title}
      summary={summary}
      rows={points}
      valueLabel={title}
      formatValue={formatValue}
      className={className}
    >
      <p className="mb-1 h-5 text-sm font-medium tabular-nums">
        {active && active.value !== null
          ? `${active.label} · ${formatValue(active.value)}`
          : ''}
      </p>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        className="h-28 w-full"
      >
        {targetValue !== undefined && (
          <line
            x1={0}
            x2={VIEW_W}
            y1={VIEW_H - (targetValue / max) * VIEW_H}
            y2={VIEW_H - (targetValue / max) * VIEW_H}
            className="stroke-muted-foreground/40"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}

        {points.map((point, i) => {
          if (point.value === null) return null;
          const h = (point.value / max) * VIEW_H;
          return (
            <rect
              key={point.label}
              x={i * (barW + GAP)}
              y={VIEW_H - h}
              width={barW}
              height={h}
              rx={1}
              className={cn(
                'transition-colors',
                selected === i ? 'fill-primary' : 'fill-primary/50'
              )}
              onPointerDown={() => setSelected(i)}
            />
          );
        })}
      </svg>
    </ChartFrame>
  );
}
