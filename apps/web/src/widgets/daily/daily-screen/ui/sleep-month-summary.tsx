import {
  CalendarCheck,
  CalendarRange,
  MoonStar,
  Star,
  Timer,
  TrendingDown,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { LoggedNight } from './sleep-month-board';

import { splitMinutes } from '@/shared/lib/health/duration';
import { StatTile } from '@/shared/ui/stat-tile';

const HEADING_ID = 'sleep-month-summary-heading';

/** One decimal on the mean mood. A month of 3s and 4s averaging "4" hides the
 *  whole difference the figure exists to show, and a second decimal is
 *  precision the 1–5 input never had. */
const MOOD_DECIMALS = 1;

/**
 * The month on screen, as six figures — "how did the month go", which thirty
 * dots cannot answer without the reader doing arithmetic by eye. It moves
 * with the grid above it: paging to July re-reads July.
 *
 * Nothing here re-derives a NIGHT; every duration arrives from `computeNight`.
 * What it does compute is the shape of a SUMMARY — a mean, a max, a min, a
 * count — which is about a window, not about what a night is.
 *
 * `nights` may hold a day with no sleep row, so every duration figure is taken
 * over the LOGGED subset, narrowed once at the top. A server component.
 */
export async function SleepMonthSummary({
  nights,
  monthLabel,
  monthSpokenLabel,
  targetMin,
  formatDay,
}: {
  /** Only the nights inside the displayed month. */
  nights: LoggedNight[];
  /** `09/2026`, already built by the caller — it also names the calendar, and
   *  formatting it twice invites the two to disagree. */
  monthLabel: string;
  /** The same month spelled out, for the heading's accessible name: "09/2026"
   *  is a header, not something worth hearing read out digit by digit. */
  monthSpokenLabel: string;
  targetMin: number;
  /** `YYYY-MM-DD` to a short human date, for the best and worst nights. */
  formatDay: (key: string) => string;
}) {
  const t = await getTranslations('dashboard.daily');

  // `null` means "no night", never "a night of zero minutes", so a day
  // written up without one drops out of every duration tile below.
  const logged = nights.filter(
    (night): night is LoggedNight & { totalSleepMin: number } =>
      night.totalSleepMin !== null
  );

  // Rated DAYS, not rated nights: from `nights`, never from `logged`, or a
  // mood recorded on an unlogged night is dropped — under-counting the tile's
  // own n, and hiding it entirely in a month with no sleep rows.
  const rated = nights.filter(
    (night): night is LoggedNight & { mood: number } => night.mood !== null
  );
  const meanMood =
    rated.length === 0
      ? null
      : rated.reduce((sum, night) => sum + night.mood, 0) / rated.length;

  const moodTile = (
    <StatTile
      icon={Star}
      label={t('sleep.monthMood')}
      value={
        meanMood === null
          ? '—'
          : t('sleep.monthMoodValue', {
              value: meanMood.toFixed(MOOD_DECIMALS),
            })
      }
      hint={
        meanMood === null
          ? t('sleep.monthMoodUnavailable')
          : t('sleep.monthMoodContext', { n: rated.length })
      }
    />
  );

  if (logged.length === 0) {
    return (
      <section aria-labelledby={HEADING_ID} className="flex flex-col gap-2">
        <Heading
          id={HEADING_ID}
          label={t('sleep.monthSummary', { monthLabel })}
          spokenLabel={t('sleep.monthSummary', {
            monthLabel: monthSpokenLabel,
          })}
        />
        {rated.length === 0 ? (
          // The tiles' own sheet, not a loose sentence where six cards were:
          // an empty state that abandons the surface reads as a failed render.
          <p className="flex items-center justify-center gap-2 rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground shadow">
            <CalendarRange aria-hidden className="size-4 shrink-0" />
            {t('sleep.monthEmpty')}
          </p>
        ) : (
          // No night logged, but a mood was still recorded — that data exists
          // and the tile says so, even with every sleep tile empty.
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {moodTile}
          </div>
        )}
      </section>
    );
  }

  const durations = logged.map((night) => night.totalSleepMin);
  const meanDurationMin =
    durations.reduce((sum, value) => sum + value, 0) / durations.length;

  const longest = logged.reduce((best, night) =>
    night.totalSleepMin > best.totalSleepMin ? night : best
  );
  const shortest = logged.reduce((worst, night) =>
    night.totalSleepMin < worst.totalSleepMin ? night : worst
  );

  const onTarget = logged.filter(
    (night) => night.totalSleepMin >= targetMin
  ).length;

  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-2">
      <Heading
        id={HEADING_ID}
        label={t('sleep.monthSummary', { monthLabel })}
        spokenLabel={t('sleep.monthSummary', { monthLabel: monthSpokenLabel })}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile
          icon={CalendarRange}
          label={t('sleep.monthNights')}
          value={logged.length}
        />

        <StatTile
          icon={Timer}
          label={t('sleep.monthMean')}
          value={t('units.hoursMinutes', splitMinutes(meanDurationMin))}
        />

        <StatTile
          icon={CalendarCheck}
          label={t('sleep.monthOnTarget')}
          value={onTarget}
          context={
            <p className="text-xs tabular-nums text-muted-foreground">
              {t('sleep.monthOnTargetContext', {
                n: onTarget,
                total: logged.length,
              })}
            </p>
          }
        />

        <StatTile
          icon={MoonStar}
          label={t('sleep.monthLongest')}
          value={t('units.hoursMinutes', splitMinutes(longest.totalSleepMin))}
          context={
            <p className="text-xs text-muted-foreground">
              {formatDay(longest.localDate)}
            </p>
          }
        />

        <StatTile
          icon={TrendingDown}
          label={t('sleep.monthShortest')}
          value={t('units.hoursMinutes', splitMinutes(shortest.totalSleepMin))}
          context={
            <p className="text-xs text-muted-foreground">
              {formatDay(shortest.localDate)}
            </p>
          }
        />

        {moodTile}
      </div>
    </section>
  );
}

/** The same `xs` heading `SleepRegularity` wears, so the two blocks in this
 *  column read as siblings rather than as two different kinds of thing. */
function Heading({
  id,
  label,
  spokenLabel,
}: {
  id: string;
  label: string;
  spokenLabel: string;
}) {
  return (
    <h2
      id={id}
      aria-label={spokenLabel}
      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
    >
      <CalendarRange aria-hidden className="size-3.5 shrink-0" />
      {label}
    </h2>
  );
}
