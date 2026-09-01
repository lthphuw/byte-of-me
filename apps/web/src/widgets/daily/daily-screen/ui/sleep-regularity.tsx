import {
  CalendarClock,
  Compass,
  Moon,
  Orbit,
  Repeat,
  Sunrise,
  Waves,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { SleepSummary } from '@/entities/sleep-log';
import { minutesToClock, splitMinutes } from '@/shared/lib/health/duration';
import {
  minutesStdDev,
  unwrapNearMidnight,
} from '@/shared/lib/health/sleep-stats';
import { StatTile } from '@/shared/ui/stat-tile';

const HEADING_ID = 'sleep-regularity-heading';

/**
 * The chronobiology block: how repeatable the nights are, and what clock the
 * body is actually keeping.
 *
 * Its own component rather than four more tiles inside `DailyScreen` because
 * every figure here shares a property none of the tiles above it have — each
 * one REFUSES to answer until the data can support it, and each refusal has to
 * say which of the two reasons it is. That branching is the bulk of the file.
 *
 * A server component: these are numbers computed in `getSleepSummary`, and
 * nothing here is interactive.
 */
export async function SleepRegularity({ summary }: { summary: SleepSummary }) {
  const t = await getTranslations('dashboard.daily');

  // The headline: how far the MIDDLE of the night moves. It reads the
  // midpoints the summary already computed, through the same population SD the
  // two deviation tiles use, so there is no second definition of either.
  const midpointSdMin = minutesStdDev(
    summary.nights.map((night) => unwrapNearMidnight(night.midsleepMin))
  );

  const nightCount = summary.freeDayCount + summary.workDayCount;
  const dayCounts = { free: summary.freeDayCount, work: summary.workDayCount };
  const noNights = t('sleep.noNightsLogged');

  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-2">
      {/* The heading is the only thing separating this block from the tile
          grid above it, and at `text-xs` in `muted-foreground` it was a line
          of text doing a rule's job. A wave, because that is what these five
          figures are about — how repeatable the cycle is — and `size-3.5`
          with `gap-1.5`, which is exactly how `StatTile` sets an icon beside
          an `xs` label, so the heading and the tiles under it share one
          measure. */}
      <h2
        id={HEADING_ID}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
      >
        <Waves aria-hidden className="size-3.5 shrink-0" />
        {t('sleep.regularity')}
      </h2>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile
          icon={Orbit}
          label={t('sleep.midpointSd')}
          value={
            midpointSdMin === null
              ? '—'
              : `± ${t('units.minutes', {
                  minutes: Math.round(midpointSdMin),
                })}`
          }
          context={
            midpointSdMin === null ? undefined : (
              <p className="text-xs text-muted-foreground">
                {t('sleep.midpointSdContext')}
              </p>
            )
          }
          hint={
            midpointSdMin === null
              ? missingReason(nightCount, noNights, t('sleep.sdUnavailable'))
              : undefined
          }
        />

        <StatTile
          icon={Moon}
          label={t('sleep.bedtimeSd')}
          value={
            summary.bedtimeSdMin === null
              ? '—'
              : `± ${t('units.minutes', {
                  minutes: Math.round(summary.bedtimeSdMin),
                })}`
          }
          hint={
            summary.bedtimeSdMin === null
              ? missingReason(nightCount, noNights, t('sleep.sdUnavailable'))
              : undefined
          }
        />
        <StatTile
          icon={Sunrise}
          label={t('sleep.waketimeSd')}
          value={
            summary.waketimeSdMin === null
              ? '—'
              : `± ${t('units.minutes', {
                  minutes: Math.round(summary.waketimeSdMin),
                })}`
          }
          hint={
            summary.waketimeSdMin === null
              ? missingReason(nightCount, noNights, t('sleep.sdUnavailable'))
              : undefined
          }
        />

        {/* "Schedule regularity", not "sleep regularity": a diary interval is
            time in bed, and calling the index SRI overclaims what typed clocks
            can see. The caveat is the tile's HINT — a phone has no hover. */}
        <StatTile
          icon={Repeat}
          label={t('sleep.sri')}
          value={summary.sri === null ? '—' : Math.round(summary.sri)}
          hint={
            summary.sri === null
              ? missingReason(
                  nightCount,
                  noNights,
                  t('sleep.sriUnavailable', { n: nightCount })
                )
              : t('sleep.sriCaveat')
          }
        />

        <StatTile
          icon={CalendarClock}
          label={t('sleep.socialJetlag')}
          value={
            summary.socialJetlagMin === null
              ? '—'
              : t('units.hoursMinutes', splitMinutes(summary.socialJetlagMin))
          }
          hint={
            summary.socialJetlagMin === null
              ? missingReason(
                  nightCount,
                  noNights,
                  t('sleep.socialJetlagUnavailable', dayCounts)
                )
              : t('sleep.socialJetlagHint')
          }
        />

        {/* `msfscMin` is minutes PAST MIDNIGHT, not a length of time, so it
            renders through `minutesToClock` and never through `splitMinutes`.
            The correction can push it either side of midnight and the helper
            wraps, so a 00:10 chronotype cannot come out as `-50m` or `24:10`.
            The hint says "clock time" out loud because this is the one tile on
            the screen whose figure is not a duration. */}
        <StatTile
          icon={Compass}
          label={t('sleep.chronotype')}
          value={
            summary.msfscMin === null ? '—' : minutesToClock(summary.msfscMin)
          }
          hint={
            summary.msfscMin === null
              ? missingReason(
                  nightCount,
                  noNights,
                  t('sleep.chronotypeUnavailable', dayCounts)
                )
              : t('sleep.chronotypeHint')
          }
        />
      </div>
    </section>
  );
}

/**
 * Which of the two causes a missing figure has.
 *
 * `freeDayCount` and `workDayCount` ride along on the summary for exactly this
 * decision. A null metric means either that nothing has been logged at all, or
 * that what was logged is the wrong shape — too few nights in a row, too few
 * days of one kind. Only the second is worth reading a threshold for, and only
 * the first is fixed by logging tonight, so collapsing them into one
 * "unavailable" string tells the reader nothing and reads as a bug.
 */
function missingReason(
  nightCount: number,
  noNights: string,
  tooFew: string
): string {
  return nightCount === 0 ? noNights : tooFew;
}
