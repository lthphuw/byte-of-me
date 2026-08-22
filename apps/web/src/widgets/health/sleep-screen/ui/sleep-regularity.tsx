import { CalendarClock, Compass, Moon, Repeat, Sunrise } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { SleepSummary } from '@/entities/sleep-log';
import { minutesToClock, splitMinutes } from '@/shared/lib/health/duration';
import { StatTile } from '@/shared/ui/stat-tile';

const HEADING_ID = 'sleep-regularity-heading';

/**
 * The chronobiology block: how repeatable the nights are, and what clock the
 * body is actually keeping.
 *
 * Its own component rather than four more tiles inside `SleepScreen` because
 * every figure here shares a property none of the tiles above it have — each
 * one REFUSES to answer until the data can support it, and each refusal has to
 * say which of the two reasons it is. That branching is the bulk of the file.
 *
 * A server component: these are numbers computed in `getSleepSummary`, and
 * nothing here is interactive.
 */
export async function SleepRegularity({ summary }: { summary: SleepSummary }) {
  const t = await getTranslations('dashboard.health');

  const nightCount = summary.freeDayCount + summary.workDayCount;
  const dayCounts = { free: summary.freeDayCount, work: summary.workDayCount };
  const noNights = t('sleep.noNightsLogged');

  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-2">
      <h2 id={HEADING_ID} className="text-xs font-medium text-muted-foreground">
        {t('sleep.regularity')}
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {/* The caveat is the tile's HINT, which renders under the value — spec
            §5.5: there is no hover on a phone, so a number whose correction
            lives in a tooltip ships without the correction. SRI from manual
            bed/wake entry reads high (no naps, and the awake minutes are a
            total with no position in the night), and the two deviation tiles
            below it are the cruder measure that assumes none of that. They sit
            in this grid, not in the one above, so the reader meets the honest
            figures in the same glance as the flattering one. */}
        <StatTile
          className="col-span-2"
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
