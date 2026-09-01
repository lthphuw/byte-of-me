import { RASTER_SPAN_MIN } from '@/features/daily/sleep-charts/lib/raster-axis';
import { minutesToClock } from '@/shared/lib/health/duration';
import { cn } from '@/shared/lib/utils';
import { ChartFrame, type ChartPoint } from '@/shared/ui/chart';

/** Row height in px. Fourteen come to 224px, which fits a 390px phone. */
const ROW_H = 16;

/** Where the axis is named, in minutes from its left edge: 18:00 → 12:00. */
const TICKS_MIN = [0, 360, 720, 1080] as const;

/** One night's four boundaries, as minutes along the raster axis — already
 *  placed by `rasterOffset`, so this file only ever divides by the span. */
export interface RasterSpan {
  bedOffset: number;
  /** Bed plus recorded latency; equal to `bedOffset` when none was. */
  onsetOffset: number;
  wakeOffset: number;
  /** Out of bed. Equal to `wakeOffset` on a row written before `riseAt`. */
  riseOffset: number;
  /** The whole row in words, for the accessible table. */
  text: string;
}

export interface RasterNight {
  localDate: string;
  /** The gutter mark — a weekday initial and a day number, nothing wider. */
  shortLabel: string;
  /** The accessible table's row header: the full date. */
  label: string;
  /** Null is a night that was never logged, and draws NOTHING. */
  span: RasterSpan | null;
}

/** Median ± SD of one boundary across the window, in axis minutes. */
export interface RasterBand {
  centreOffset: number;
  sdMin: number;
}

/**
 * A fortnight of nights, each bar spanning the clock time it was laid down to
 * the clock time it got up, against median ± SD bands.
 *
 * A server component: nothing here is interactive, so the drawing costs the
 * browser no JavaScript. Exact figures live in the `ChartFrame` table.
 */
export function SleepRaster({
  nights,
  bedBand,
  wakeBand,
  title,
  summary,
  valueLabel,
  className,
}: {
  nights: RasterNight[];
  /** Null below two logged nights, where a deviation is not defined. */
  bedBand: RasterBand | null;
  wakeBand: RasterBand | null;
  title: string;
  summary: string;
  valueLabel: string;
  className?: string;
}) {
  const rows: ChartPoint[] = nights.map((night) => ({
    label: night.label,
    value: night.span === null ? null : night.span.wakeOffset,
    text: night.span?.text,
  }));

  return (
    <ChartFrame
      title={title}
      summary={summary}
      rows={rows}
      valueLabel={valueLabel}
      className={className}
    >
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2">
        <div className="flex flex-col">
          {nights.map((night) => (
            <span
              key={night.localDate}
              className={cn(
                'flex items-center text-[10px] leading-none tabular-nums',
                night.span === null
                  ? 'text-muted-foreground/50'
                  : 'text-muted-foreground'
              )}
              style={{ height: ROW_H }}
            >
              {night.shortLabel}
            </span>
          ))}
        </div>

        <div className="relative" style={{ height: nights.length * ROW_H }}>
          <Band band={bedBand} />
          <Band band={wakeBand} />

          {TICKS_MIN.slice(1, -1).map((tick) => (
            <span
              key={tick}
              className="absolute inset-y-0 w-px bg-border"
              style={{ left: `${(tick / RASTER_SPAN_MIN) * 100}%` }}
            />
          ))}

          {nights.map((night, i) => (
            <div
              key={night.localDate}
              className="absolute inset-x-0"
              style={{ top: i * ROW_H, height: ROW_H }}
            >
              {night.span === null ? null : (
                <>
                  {/* Latency at the head and the lie-in at the tail are the
                      awake spans with a KNOWN position. The recorded awake
                      minutes have none, so they stay in the row's text. */}
                  <Mark
                    from={night.span.bedOffset}
                    to={night.span.onsetOffset}
                    tone="awake"
                  />
                  <Mark
                    from={night.span.onsetOffset}
                    to={night.span.wakeOffset}
                    tone="asleep"
                  />
                  <Mark
                    from={night.span.wakeOffset}
                    to={night.span.riseOffset}
                    tone="awake"
                  />
                </>
              )}
            </div>
          ))}
        </div>

        <div className="relative col-start-2 mt-1.5 h-3">
          {TICKS_MIN.map((tick, i) => (
            <span
              key={tick}
              className={cn(
                'absolute text-[10px] leading-none tabular-nums text-muted-foreground',
                i === 0 && 'left-0',
                i === TICKS_MIN.length - 1 && 'right-0'
              )}
              style={
                i === 0 || i === TICKS_MIN.length - 1
                  ? undefined
                  : {
                      left: `${(tick / RASTER_SPAN_MIN) * 100}%`,
                      transform: 'translateX(-50%)',
                    }
              }
            >
              {minutesToClock(tick + 1080)}
            </span>
          ))}
        </div>
      </div>
    </ChartFrame>
  );
}

/** One segment of a night. The two alphas are the outer steps of
 *  `MONTH_CALENDAR_FILL`'s measured ramp, and hold in both themes. */
function Mark({
  from,
  to,
  tone,
}: {
  from: number;
  to: number;
  tone: 'asleep' | 'awake';
}) {
  const width = Math.max(0, to - from);
  if (width === 0) return null;

  return (
    <span
      className={cn(
        'absolute inset-y-[3px] rounded-[2px]',
        tone === 'asleep' ? 'bg-primary' : 'bg-primary/30'
      )}
      style={{
        left: `${(from / RASTER_SPAN_MIN) * 100}%`,
        width: `${(width / RASTER_SPAN_MIN) * 100}%`,
      }}
    />
  );
}

/** The window a boundary usually falls in, behind the marks. Clamped, because
 *  a wide SD early on would otherwise run off both ends of the plot. */
function Band({ band }: { band: RasterBand | null }) {
  if (band === null) return null;

  const from = Math.max(0, band.centreOffset - band.sdMin);
  const to = Math.min(RASTER_SPAN_MIN, band.centreOffset + band.sdMin);
  if (to <= from) return null;

  return (
    <>
      <span
        className="absolute inset-y-0 bg-foreground/10"
        style={{
          left: `${(from / RASTER_SPAN_MIN) * 100}%`,
          width: `${((to - from) / RASTER_SPAN_MIN) * 100}%`,
        }}
      />
      <span
        className="absolute inset-y-0 w-px bg-foreground/30"
        style={{ left: `${(band.centreOffset / RASTER_SPAN_MIN) * 100}%` }}
      />
    </>
  );
}
