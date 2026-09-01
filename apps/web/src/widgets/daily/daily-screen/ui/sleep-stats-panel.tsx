import { Activity, Gauge, Hourglass } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { SleepRegularity } from './sleep-regularity';

import type { SleepSummary } from '@/entities/sleep-log';
import { splitMinutes } from '@/shared/lib/health/duration';
import type { SleepDebt } from '@/shared/lib/health/sleep-insights';
import { StaggerItem, StaggerList } from '@/shared/ui/motion';
import { StatMeter, StatTile } from '@/shared/ui/stat-tile';

const HEADING_ID = 'sleep-recent-heading';

/**
 * The derived numbers of the last fortnight, and what each is measured
 * against: efficiency needs the whole it is a fraction of, debt needs the
 * nightly need it accumulated against.
 *
 * A server component; the stagger wrapper is the only client code here.
 */
export async function SleepStatsPanel({
  summary,
  debt,
  windowDays,
}: {
  summary: SleepSummary;
  /** Computed over the 90-night insight window, not this panel's fortnight:
   *  the need it is measured against is a P90 of FREE-DAY sleep, which a
   *  fortnight cannot supply. Null when that read failed. */
  debt: SleepDebt | null;
  /** How many nights `getSleepSummary` was called with. Passed rather than
   *  re-declared, because the heading PRINTS it and a second copy of the
   *  number is a second chance for the heading to lie about the read. */
  windowDays: number;
}) {
  const t = await getTranslations('dashboard.daily');

  const efficiency = summary.nights.at(-1)?.efficiencyPct ?? null;

  return (
    <>
      {/* ~60ms apart, which is a cue that the tiles are one group rather than
          a decorative entrance. `MotionConfig reducedMotion="user"` at the app
          root drops the transform half of this for anyone who has asked for
          reduced motion and keeps the fade. */}
      {/* A VISIBLE heading, not just an `aria-label`. This column stacks three
          groups of tiles — the month, the fortnight, the chronobiology — and
          the other two are titled, so the untitled one in the middle read as
          the tail of the group above it and its three figures were taken as
          more monthly numbers. They are not: these are the last fourteen
          nights, which is a different window from the month on screen and
          becomes a badly wrong reading the moment the reader pages back to
          July. Same `xs` muted heading with a `size-3.5` glyph the other two
          wear, so the three read as siblings. */}
      <section aria-labelledby={HEADING_ID} className="flex flex-col gap-2">
        <h2
          id={HEADING_ID}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
        >
          <Activity aria-hidden className="size-3.5 shrink-0" />
          {t('sleep.recentWindow', { days: windowDays })}
        </h2>

        <StaggerList stagger={0.06} className="grid grid-cols-2 gap-3">
          <StaggerItem className="min-w-0">
            <StatTile
              icon={Gauge}
              label={t('sleep.efficiency')}
              value={efficiency === null ? '—' : `${Math.round(efficiency)}%`}
              context={
                efficiency === null ? undefined : (
                  <StatMeter
                    fraction={efficiency / 100}
                    label={t('sleep.efficiencyContext')}
                  />
                )
              }
              hint={
                efficiency === null
                  ? t('sleep.efficiencyUnavailable')
                  : undefined
              }
            />
          </StaggerItem>

          <StaggerItem className="min-w-0">
            {/* The need, not the target, and the nap line beside it: a long
                nap is NOT deducted here, and the screen says so rather than
                leaving the reader to assume either way. */}
            <StatTile
              icon={Hourglass}
              label={t('sleep.debt')}
              value={
                debt === null
                  ? '—'
                  : t('units.hoursMinutes', splitMinutes(debt.debtMin))
              }
              context={
                debt === null ? undefined : (
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {debt.needSource === 'freeDayP90'
                      ? t('sleep.debtNeedFreeDay', splitMinutes(debt.needMin))
                      : t('sleep.debtNeedTarget', splitMinutes(debt.needMin))}
                  </p>
                )
              }
              hint={
                debt === null
                  ? t('sleep.debtUnavailable')
                  : debt.longNapNights > 0
                    ? t('sleep.debtNap', { n: debt.longNapNights })
                    : t('sleep.debtCaveatWeighted')
              }
            />
          </StaggerItem>
        </StaggerList>
      </section>

      {/* The two deviation tiles stay INSIDE this panel. They are what keeps
          the regularity index honest, and a reader who has to scroll between
          the flattering number and the crude one has already taken the
          flattering one at face value. */}
      <SleepRegularity summary={summary} />
    </>
  );
}
