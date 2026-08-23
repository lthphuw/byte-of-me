'use client';

import { useTranslations } from 'next-intl';

import { labelForCode, useGymLabels } from '@/shared/hooks/use-gym-labels';
import { cn } from '@/shared/lib/utils';
import { ChartFrame } from '@/shared/ui/chart';

/** Headroom past the top of the band, so the upper edge is never flush with
 *  the right-hand end of the track and readable as "the maximum". */
const SCALE_HEADROOM = 4;

export interface MuscleSetRow {
  /** A `Muscle` code. Translated HERE rather than on the server: next-intl
   *  only type-checks literal keys, so the seventeen labels are spelled out
   *  once in `useGymLabels` and every gym surface reads them from there. */
  muscle: string;
  sets: number;
}

/**
 * Weekly hard sets per muscle, against Schoenfeld's 10–20 band.
 *
 * **The band is a background REGION, not a hue and not a pass mark.** It is
 * drawn as a shaded rectangle behind the bars with a hairline at each edge and
 * the two numbers printed on the axis beneath it, so it survives an achromatic
 * palette, a greyscale print and a reader who cannot see the fill at all. A
 * bar that lands inside it is drawn one shade step darker than one that does
 * not — a shade step, never a colour, and never the only cue: every row prints
 * its own number at the end of the track, and the footer states in words what
 * the band is.
 *
 * Horizontal bars rather than vertical: there are up to seventeen muscles and
 * their names are words, and a vertical chart would either rotate the labels
 * or drop them.
 *
 * The footer carries the two caveats this chart cannot be honest without. The
 * 0.5 credit for a secondary muscle is a convention this project chose — there
 * is no measurement behind it — and the published range it is being compared
 * against did not count sets that way, so the two numbers are adjacent rather
 * than commensurable. It sits OUTSIDE the `aria-hidden` drawing on purpose:
 * words explaining what the shading means are exactly the part a reader who
 * cannot see the shading still needs.
 */
export function MuscleSetsChart({
  rows,
  bandLow,
  bandHigh,
  secondaryCredit,
  title,
  summary,
  className,
}: {
  rows: MuscleSetRow[];
  bandLow: number;
  bandHigh: number;
  secondaryCredit: number;
  title: string;
  summary: string;
  className?: string;
}) {
  const t = useTranslations('dashboard.health.stats');
  const labels = useGymLabels();

  const formatSets = (value: number) =>
    t('setsValue', { value: Math.round(value * 2) / 2 });

  const max = Math.max(
    bandHigh + SCALE_HEADROOM,
    ...rows.map((row) => row.sets)
  );
  const pct = (value: number) => `${(value / max) * 100}%`;
  const named = rows.map((row) => ({
    ...row,
    label: labelForCode(labels.muscle, row.muscle),
  }));

  return (
    <ChartFrame
      title={title}
      summary={summary}
      rows={named.map((row) => ({ label: row.label, value: row.sets }))}
      valueLabel={t('setsColumn')}
      formatValue={formatSets}
      className={className}
      footer={
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t('bandLegend', { low: bandLow, high: bandHigh })}{' '}
          {t('secondaryCreditNote', { credit: secondaryCredit })}
        </p>
      }
    >
      <div className="flex flex-col gap-1.5">
        {named.map((row) => {
          const inBand = row.sets >= bandLow && row.sets <= bandHigh;

          return (
            <div
              key={row.label}
              className="grid grid-cols-[minmax(4rem,7rem)_1fr_2.75rem] items-center gap-2"
            >
              <span className="truncate text-xs text-muted-foreground">
                {row.label}
              </span>

              <div className="relative h-4 rounded-sm bg-muted/50">
                {/* The band, behind the bar by DOM order. Two hairlines carry
                    it as much as the fill does, so it reads at 0% saturation
                    and in a greyscale print. */}
                <div
                  className="absolute inset-y-0 border-x border-border bg-muted"
                  style={{
                    left: pct(bandLow),
                    width: pct(bandHigh - bandLow),
                  }}
                />

                <div
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-sm',
                    inBand ? 'bg-primary' : 'bg-primary/45'
                  )}
                  style={{ width: pct(Math.min(row.sets, max)) }}
                />
              </div>

              <span className="text-right text-xs font-medium tabular-nums">
                {formatSets(row.sets)}
              </span>
            </div>
          );
        })}

        {/* The axis: the two band edges, printed as numbers under the exact
            positions they mark. Without them the shading is a rectangle
            nobody can measure against. */}
        <div className="grid grid-cols-[minmax(4rem,7rem)_1fr_2.75rem] gap-2">
          <span />
          <div className="relative h-4">
            <span
              className="absolute top-0 -translate-x-1/2 text-[11px] tabular-nums text-muted-foreground"
              style={{ left: pct(bandLow) }}
            >
              {bandLow}
            </span>
            <span
              className="absolute top-0 -translate-x-1/2 text-[11px] tabular-nums text-muted-foreground"
              style={{ left: pct(bandHigh) }}
            >
              {bandHigh}
            </span>
          </div>
          <span />
        </div>
      </div>
    </ChartFrame>
  );
}
