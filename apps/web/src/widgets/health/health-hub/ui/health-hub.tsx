import { buttonVariants } from '@byte-of-me/ui';
import { getTranslations } from 'next-intl/server';

import { getSleepSummary } from '@/entities/sleep-log';
import { SleepDurationChart } from '@/features/health/sleep-charts';
import { Link } from '@/shared/i18n/navigation';
import { splitMinutes } from '@/shared/lib/health/duration';
import {
  addDays,
  localDateKey,
  toLocalDate,
} from '@/shared/lib/health/local-date';
import { getRequestTimeZone } from '@/shared/lib/health/request-time-zone';
import { cn } from '@/shared/lib/utils';
import { StatTile } from '@/shared/ui/stat-tile';

/** The window every figure on this screen is computed over, and the window the
 *  rolling debt is defined against — `getSleepSummary` uses the same number for
 *  both, so this is not a display choice. */
const WINDOW_DAYS = 14;

/**
 * The health overview: where last night landed, what it cost, and one way on.
 *
 * A server component. Everything here is a number derived from a single
 * owner-scoped read, and computing it on the server keeps the statistics
 * module out of the browser bundle entirely.
 *
 * It renders a failed read IN PLACE and never throws. This is awaited by a
 * route's page component, where a throw escapes the RSC and hands the whole
 * page to the root `error.tsx` — replacing a screen that could still show its
 * navigation and its action with a full-page apology.
 */
export async function HealthHub() {
  const t = await getTranslations('dashboard.health');
  const timeZone = await getRequestTimeZone();

  const summaryRes = await getSleepSummary({ days: WINDOW_DAYS, timeZone });

  const today = toLocalDate(new Date(), timeZone);
  const todayKey = localDateKey(today);
  const startKey = localDateKey(addDays(today, -(WINDOW_DAYS - 1)));

  const summary = summaryRes.success ? summaryRes.data : null;
  const lastNight = summary?.nights.at(-1) ?? null;
  const loggedToday = lastNight?.localDate === todayKey;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-clip">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
          {summary === null ? (
            <p className="text-sm text-destructive">{t('errors.load')}</p>
          ) : (
            <>
              <section
                aria-label={t('hub.ariaLabel')}
                className="grid grid-cols-2 gap-3"
              >
                <StatTile
                  label={t('hub.lastNight')}
                  value={
                    lastNight
                      ? t(
                          'units.hoursMinutes',
                          splitMinutes(lastNight.totalSleepMin)
                        )
                      : '—'
                  }
                  hint={lastNight?.estimated ? t('hub.estimated') : undefined}
                />
                <StatTile
                  label={t('hub.debt')}
                  value={t('units.hoursMinutes', splitMinutes(summary.debtMin))}
                  hint={t('sleep.debtCaveat')}
                />
                <StatTile
                  label={t('hub.streak')}
                  value={summary.streak}
                  className="col-span-2"
                />
              </section>

              {summary.nights.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('hub.noData')}
                </p>
              ) : (
                <SleepDurationChart
                  nights={summary.nights.map((night) => ({
                    localDate: night.localDate,
                    value: night.totalSleepMin,
                  }))}
                  startKey={startKey}
                  days={WINDOW_DAYS}
                  targetMin={summary.targetMin}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* EXACTLY one bottom action, and its label is the only thing that
          changes with state. Two competing calls to action on a phone is how
          the wrong one gets pressed; the destination is the same screen either
          way, because logging a night and correcting it are the same act. */}
      <div className="shrink-0 border-t bg-background px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto w-full max-w-2xl">
          <Link
            href="/space/health/sleep"
            className={cn(buttonVariants(), 'h-14 w-full text-base')}
          >
            {loggedToday ? t('hub.editSleep') : t('hub.logSleep')}
          </Link>
        </div>
      </div>
    </div>
  );
}
