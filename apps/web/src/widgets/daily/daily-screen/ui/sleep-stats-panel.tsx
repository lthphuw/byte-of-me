import { Activity, Gauge, Hourglass } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { SleepRegularity } from './sleep-regularity';

import type { SleepSummary } from '@/entities/sleep-log';
import { splitMinutes } from '@/shared/lib/health/duration';
import type { SleepDebt } from '@/shared/lib/health/sleep-insights';
import { StaggerItem, StaggerList } from '@/shared/ui/motion';
import { StatMeter, StatTile } from '@/shared/ui/stat-tile';

const HEADING_ID = 'sleep-recent-heading';

/** The last fortnight's derived numbers, each printed with what it is
 *  measured against — efficiency needs its whole, debt needs the nightly
 *  need. A server component; only the stagger wrapper is client code. */
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
  /** What `getSleepSummary` was called with. Passed, not re-declared: the
   *  heading PRINTS it, and a second copy is a chance to lie about it. */
  windowDays: number;
}) {
  const t = await getTranslations('dashboard.daily');

  const efficiency = summary.nights.at(-1)?.efficiencyPct ?? null;

  return (
    <>
      {/* A VISIBLE heading, not an `aria-label`: untitled between two titled
          groups, this read as the tail of the month above it, and these are
          the last fourteen nights — a different window entirely. */}
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

      {/* The deviation tiles stay INSIDE this panel: they keep the regularity
          index honest, and a reader who has to scroll between the flattering
          number and the crude one has already believed the flattering one. */}
      <SleepRegularity summary={summary} />
    </>
  );
}
