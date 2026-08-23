import { Activity } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { AcwrReading } from '@/entities/health-insight';

/** The top of the scale the ratio is drawn against. Two covers the band, the
 *  1.5 "elevated" mark and a good deal of headroom past it; a ratio beyond it
 *  pins to the end and the printed number carries the rest. */
const SCALE_MAX = 2;

/** Commonly cited, and drawn only as a hairline with its number beside it —
 *  the band already carries the shading, and a second filled region would
 *  read as a second recommendation. */
const ELEVATED_AT = 1.5;

const BAND_LOW = 0.8;
const BAND_HIGH = 1.3;

/**
 * The acute:chronic workload ratio, with its criticism printed underneath it.
 *
 * **The caveat is body text on the card, not a tooltip.** There is no hover on
 * a phone, so a warning that lives in one does not exist; and this particular
 * warning is not decoration — Impellizzeri et al. show the ratio is
 * autocorrelated by construction, because the seven-day window is contained in
 * the twenty-eight-day one, and that the reported "sweet spot" does not
 * survive reanalysis with that artifact controlled. The measure stays because
 * "a week far out of line with the month behind it deserves a second look" is
 * worth prompting on. It is a prompt. Nothing in this app acts on it.
 *
 * A null gets a SPECIFIC sentence, never "no data". The reading carries the
 * two counts that separate the causes: too few sessions with a computable load
 * in the chronic window (and, separately, how many were dropped for missing
 * one of session RPE or a finish time), or a chronic window that summed to
 * zero load. "Needs 8 workouts in the last 28 days, 5 so far" is actionable;
 * "unavailable" is not.
 */
export async function AcwrCard({ acwr }: { acwr: AcwrReading }) {
  const t = await getTranslations('dashboard.health.stats');

  const ratio = acwr.ratio;
  const pct = (value: number) =>
    `${(Math.min(value, SCALE_MAX) / SCALE_MAX) * 100}%`;

  return (
    <section className="flex flex-col gap-3 rounded-3xl border bg-card p-5 shadow">
      <h2 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Activity aria-hidden className="size-3.5 shrink-0" />
        {t('acwrTitle')}
      </h2>

      <p className="text-3xl font-semibold tabular-nums leading-none">
        {ratio === null ? '—' : t('ratioValue', { value: round(ratio) })}
      </p>

      {ratio === null ? (
        <p className="text-sm text-muted-foreground">{unavailableCopy()}</p>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <div aria-hidden className="relative h-4 rounded-sm bg-muted/50">
              {/* The reference band, behind the marker by DOM order. Shaded
                  fill plus a hairline at each edge, so it reads on a palette
                  with no hue at all. */}
              <div
                className="absolute inset-y-0 border-x border-border bg-muted"
                style={{
                  left: pct(BAND_LOW),
                  width: `${((BAND_HIGH - BAND_LOW) / SCALE_MAX) * 100}%`,
                }}
              />
              <div
                className="absolute inset-y-0 w-px bg-muted-foreground/50"
                style={{ left: pct(ELEVATED_AT) }}
              />
              {/* The reading itself: a full-height rule, not a dot, so it is
                  legible against the band it crosses. */}
              <div
                className="absolute -inset-y-1 w-0.5 rounded-full bg-primary"
                style={{ left: pct(ratio) }}
              />
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('acwrBandLegend', {
                low: BAND_LOW,
                high: BAND_HIGH,
                elevated: ELEVATED_AT,
              })}
            </p>
          </div>

          <p className="text-xs tabular-nums text-muted-foreground">
            {t('acwrContext', {
              acute: Math.round(acwr.acuteLoad),
              acuteDays: acwr.acuteDays,
              chronic: Math.round(acwr.chronicLoad),
              chronicDays: acwr.chronicDays,
            })}
          </p>
        </>
      )}

      <p className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">
        {t('acwrCaveat')}
      </p>
    </section>
  );

  /**
   * Two different nulls, two different sentences.
   *
   * `acwr()` returns null when the chronic window holds fewer than
   * `minChronicSessions` sessions with a computable load, and — separately —
   * when the chronic mean is zero. The second is nearly unreachable in
   * practice, but reporting it as "not enough sessions" would be a lie about
   * data that is in fact complete.
   */
  function unavailableCopy(): string {
    if (acwr.chronicKnown < acwr.minChronicSessions) {
      return acwr.chronicUnknown > 0
        ? t('acwrNeedsSessionsPartial', {
            min: acwr.minChronicSessions,
            days: acwr.chronicDays,
            known: acwr.chronicKnown,
            unknown: acwr.chronicUnknown,
          })
        : t('acwrNeedsSessions', {
            min: acwr.minChronicSessions,
            days: acwr.chronicDays,
            known: acwr.chronicKnown,
          });
    }

    return t('acwrNoLoad', { days: acwr.chronicDays });
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
