'use client';

import { ChartFrame, type ChartPoint } from './chart-frame';

import { cn } from '@/shared/lib/utils';

const CELL = 14;
const GAP = 3;
const ROWS = 7;

/**
 * A day grid, one column per week.
 *
 * Fixed 14px cells that scroll horizontally rather than shrinking to fit: a
 * year squeezed into a phone's width gives 1px columns nobody can tap. The
 * frame gives this its own `overflow-x`, and the container is scrolled to the
 * right on mount so the most recent week is the one on screen.
 *
 * `points` must be in ascending date order and start on the first day of a
 * week — the caller pads, because only the caller knows which day the week
 * starts on in the reader's locale.
 */
export function CalendarHeatmap({
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
  const weeks = Math.ceil(points.length / ROWS);
  const max = Math.max(...points.map((p) => p.value ?? 0), 1);
  const width = weeks * (CELL + GAP);
  const height = ROWS * (CELL + GAP);

  return (
    <ChartFrame
      title={title}
      summary={summary}
      rows={points}
      valueLabel={title}
      className={className}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="block"
      >
        {points.map((point, i) => {
          const week = Math.floor(i / ROWS);
          const day = i % ROWS;
          // Opacity, not a colour ramp: one token stays correct in both themes,
          // where a hardcoded scale would need two.
          const intensity =
            point.value === null ? 0 : 0.15 + (point.value / max) * 0.85;

          return (
            <rect
              key={point.label}
              x={week * (CELL + GAP)}
              y={day * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={3}
              className={cn(
                point.value === null ? 'fill-muted' : 'fill-primary'
              )}
              opacity={point.value === null ? 1 : intensity}
            >
              <title>
                {point.label}
                {point.value === null ? '' : ` · ${formatValue(point.value)}`}
              </title>
            </rect>
          );
        })}
      </svg>
    </ChartFrame>
  );
}
