'use client';

import { useState } from 'react';

import { ChartFrame, type ChartPoint } from './chart-frame';

const VIEW_W = 320;
const VIEW_H = 120;

/**
 * A trend line with a touch crosshair.
 *
 * Gaps are real gaps: a `null` breaks the path rather than interpolating
 * across it, because a straight line through a night that was never logged is
 * a claim the data does not support.
 */
export function LineChart({
  points,
  formatValue,
  title,
  summary,
  className,
}: {
  points: ChartPoint[];
  formatValue: (value: number) => string;
  title: string;
  summary: string;
  className?: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  const values = points
    .map((p) => p.value)
    .filter((v): v is number => v !== null);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;

  const x = (i: number) =>
    points.length <= 1 ? 0 : (i / (points.length - 1)) * VIEW_W;
  const y = (v: number) => VIEW_H - ((v - min) / span) * VIEW_H;

  // Segments rather than one path: a null must break the line, not be skipped
  // over as if the two neighbours were adjacent.
  const segments: string[] = [];
  let current: string[] = [];
  points.forEach((point, i) => {
    if (point.value === null) {
      if (current.length > 1) segments.push(current.join(' '));
      current = [];
      return;
    }
    current.push(
      `${current.length === 0 ? 'M' : 'L'} ${x(i)} ${y(point.value)}`
    );
  });
  if (current.length > 1) segments.push(current.join(' '));

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
        className="h-28 w-full touch-pan-y"
        onPointerDown={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientX - rect.left) / rect.width;
          setSelected(
            Math.min(
              points.length - 1,
              Math.max(0, Math.round(ratio * (points.length - 1)))
            )
          );
        }}
      >
        {segments.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            className="stroke-primary"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {selected !== null && (
          <line
            x1={x(selected)}
            x2={x(selected)}
            y1={0}
            y2={VIEW_H}
            className="stroke-muted-foreground/50"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </ChartFrame>
  );
}
