import { buttonVariants } from '@byte-of-me/ui';
import { Flame, Hourglass } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { getSleepSummary } from '@/entities/sleep-log';
import { SleepDurationChart } from '@/features/health/sleep-charts';
import { SleepDurationHero } from '@/features/health/sleep-entry';
import { Link } from '@/shared/i18n/navigation';
import { splitMinutes } from '@/shared/lib/health/duration';
import {
  addDays,
  localDateKey,
  toLocalDate,
} from '@/shared/lib/health/local-date';
import { getRequestTimeZone } from '@/shared/lib/health/request-time-zone';
import { cn } from '@/shared/lib/utils';
import { StaggerItem, StaggerList } from '@/shared/ui/motion';
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
 * Last night is the HERO — the same ring the sleep screen draws, imported
 * from the entry feature rather than reimplemented, because "a duration
 * against its target" is one component and two copies of it would drift.
 * The tiles beside it are the cost and the run; the chart is the fortnight
 * they came out of.
 *
 * Two layouts, and they are the sleep screen's, deliberately: `max-w-4xl`
 * (the width `SpaceHub` uses), a phone column below `lg` with the action
 * pinned to the bottom, and at `lg` a 2fr/3fr split with the action inline
 * under the hero. Moving between the two tabs should not move the page.
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

  // EXACTLY one bottom action, and its label is the only thing that changes
  // with state. Two competing calls to action on a phone is how the wrong one
  // gets pressed; the destination is the same screen either way, because
  // logging a night and correcting it are the same act.
  const actionLink = (
    <Link
      href="/space/health/sleep"
      className={cn(buttonVariants(), 'h-14 w-full text-base')}
    >
      {loggedToday ? t('hub.editSleep') : t('hub.logSleep')}
    </Link>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-clip">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          {summary === null ? (
            <p className="text-sm text-destructive-text">{t('errors.load')}</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-8">
              <div className="flex min-w-0 flex-col gap-6">
                <SleepDurationHero
                  durationMin={lastNight?.totalSleepMin ?? null}
                  targetMin={summary.targetMin}
                  label={t('hub.lastNight')}
                  emptyLabel={t('hub.noData')}
                  footnote={
                    lastNight?.estimated ? t('hub.estimated') : undefined
                  }
                />

                {/* Inline at `lg`; the pinned bar below owns it on a phone.
                    `hidden` is `display: none`, so only one of the two is ever
                    focusable or in the accessibility tree. */}
                <div className="hidden lg:block">{actionLink}</div>
              </div>

              <div className="flex min-w-0 flex-col gap-6 border-t pt-6 lg:border-t-0 lg:pt-0">
                <section aria-label={t('hub.ariaLabel')}>
                  <StaggerList
                    stagger={0.06}
                    className="grid grid-cols-2 gap-3"
                  >
                    <StaggerItem className="min-w-0">
                      <StatTile
                        icon={Hourglass}
                        label={t('hub.debt')}
                        value={t(
                          'units.hoursMinutes',
                          splitMinutes(summary.debtMin)
                        )}
                        context={
                          <p className="text-xs tabular-nums text-muted-foreground">
                            {t(
                              'sleep.nightlyTarget',
                              splitMinutes(summary.targetMin)
                            )}
                          </p>
                        }
                        hint={t('sleep.debtCaveat')}
                      />
                    </StaggerItem>

                    <StaggerItem className="min-w-0">
                      <StatTile
                        icon={Flame}
                        label={t('hub.streak')}
                        value={summary.streak}
                      />
                    </StaggerItem>
                  </StaggerList>
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
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Outside the scroll area, so it is where a thumb already is on every
          frame. `env(safe-area-inset-bottom)` keeps it clear of the iOS home
          indicator. Gone at `lg`, where a bar stapled across a monitor reads
          as a phone app in a browser window. */}
      <div className="shrink-0 border-t bg-background px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <div className="mx-auto w-full max-w-4xl">{actionLink}</div>
      </div>
    </div>
  );
}
