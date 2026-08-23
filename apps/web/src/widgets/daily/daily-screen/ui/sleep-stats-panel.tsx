import { Activity, Flame, Gauge, Hourglass } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { SleepRegularity } from './sleep-regularity';

import type { SleepSummary } from '@/entities/sleep-log';
import { splitMinutes } from '@/shared/lib/health/duration';
import { addDays, localDateKey } from '@/shared/lib/health/local-date';
import { StaggerItem, StaggerList } from '@/shared/ui/motion';
import { StatDots, StatMeter, StatTile } from '@/shared/ui/stat-tile';

const HEADING_ID = 'sleep-recent-heading';

/** How many nights the streak tile's dots look back over. A week is the span
 *  a reader can count at a glance without the dots shrinking below a
 *  distinguishable size on a 149px-wide tile. */
const DOT_DAYS = 7;

/**
 * The derived numbers, as the sleep screen's second column.
 *
 * Split out of `DailyScreen` because that file is now a read, a set of
 * defaults and two layouts; this is the part that decides what each figure is
 * measured AGAINST, and those decisions are the whole point of the tiles. A
 * bare "82%" or "3" is a number without a claim: efficiency needs the whole it
 * is a fraction of, debt needs the nightly target it accumulated against, and
 * a streak of 3 says nothing about whether the fortnight behind it was solid
 * or empty — hence the run of dots.
 *
 * A server component: every figure here is computed in `getSleepSummary`, and
 * nothing on this panel is interactive. The stagger wrapper around it is the
 * only client code, and it receives this markup as children.
 */
export async function SleepStatsPanel({
  summary,
  todayKey,
  windowDays,
}: {
  summary: SleepSummary;
  /** `YYYY-MM-DD` of the reader's today, so the dot run ends on the right day
   *  rather than on the last day that happened to be logged. */
  todayKey: string;
  /** How many nights `getSleepSummary` was called with. Passed rather than
   *  re-declared, because the heading PRINTS it and a second copy of the
   *  number is a second chance for the heading to lie about the read. */
  windowDays: number;
}) {
  const t = await getTranslations('dashboard.daily');

  const efficiency = summary.nights.at(-1)?.efficiencyPct ?? null;
  const logged = new Set(summary.nights.map((night) => night.localDate));
  const today = new Date(`${todayKey}T00:00:00.000Z`);

  const dots = Array.from({ length: DOT_DAYS }, (_, i) =>
    logged.has(localDateKey(addDays(today, -(DOT_DAYS - 1 - i))))
  );
  const dotCount = dots.filter(Boolean).length;

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

        <StaggerList
          stagger={0.06}
          className="grid grid-cols-2 gap-3 md:grid-cols-3"
        >
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
            <StatTile
              icon={Hourglass}
              label={t('sleep.debt')}
              value={t('units.hoursMinutes', splitMinutes(summary.debtMin))}
              context={
                <p className="text-xs tabular-nums text-muted-foreground">
                  {t('sleep.nightlyTarget', splitMinutes(summary.targetMin))}
                </p>
              }
              hint={t('sleep.debtCaveat')}
            />
          </StaggerItem>

          <StaggerItem className="col-span-2 min-w-0 md:col-span-1">
            <StatTile
              icon={Flame}
              label={t('sleep.streak')}
              value={summary.streak}
              context={
                <StatDots
                  filled={dots}
                  label={t('sleep.streakContext', {
                    n: dotCount,
                    total: DOT_DAYS,
                  })}
                />
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
