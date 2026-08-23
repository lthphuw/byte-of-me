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
 * The month on screen, as six figures.
 *
 * The calendar answers "which nights" and this answers "how did the month go"
 * — a question thirty dots genuinely cannot answer, because a reader comparing
 * shades across five rows is doing arithmetic by eye. It sits directly under
 * the grid it describes and moves with it: paging to July re-reads July.
 *
 * **Nothing here re-derives a night.** Every duration comes from `computeNight`
 * in `shared/lib/health/sleep-stats`, which the screen already ran to draw the
 * marks — this component receives the results. What it does compute is the
 * shape of a SUMMARY: a mean, a maximum, a minimum, a count over a threshold.
 * None of those is in the statistics module, and none of them belongs there:
 * that file is about what a NIGHT is, and a monthly mean is about a window a
 * reader happens to be looking at. Mean mood is local for a second reason —
 * mood is a subjective 1–5 the statistics module deliberately never reads.
 *
 * `nights` may include a day with no sleep row at all — `DayEntry` is a
 * separate table precisely so a day can be written up without a night logged
 * — so every duration-based figure below is computed over the LOGGED subset,
 * narrowed once at the top rather than re-checked in every reducer.
 *
 * A server component: these are numbers over data already on the server, and
 * nothing on the panel is interactive.
 */
export async function SleepMonthSummary({
  nights,
  monthLabel,
  targetMin,
  formatDay,
}: {
  /** Only the nights inside the displayed month. */
  nights: LoggedNight[];
  /** The month's name, already localized by the caller — it also names the
   *  calendar above, and formatting it twice invites the two to disagree. */
  monthLabel: string;
  targetMin: number;
  /** `YYYY-MM-DD` to a short human date, for the best and worst nights. */
  formatDay: (key: string) => string;
}) {
  const t = await getTranslations('dashboard.health');

  // A day written up with no sleep row has nothing for a duration figure to
  // say — `null` there means "no night", not "a night of zero minutes" — so
  // it drops out of every tile below except the ones this component does not
  // draw at all.
  const logged = nights.filter(
    (night): night is LoggedNight & { totalSleepMin: number } =>
      night.totalSleepMin !== null
  );

  // Rated days, not rated NIGHTS: mood comes from `DayEntry`, which exists
  // precisely so a day can be journalled with no sleep row at all. Deriving
  // this from `logged` would silently drop a mood recorded on a night that
  // was never logged — under-counting "Across N days you rated" and, in a
  // month with zero sleep rows, hiding the tile entirely behind the early
  // return below.
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
        />
        {rated.length === 0 ? (
          // The tiles' own sheet, not a loose sentence where six cards were.
          // An empty state that abandons the surface reads as a failed
          // render; one that keeps it reads as a month with nothing in it,
          // which is what it is.
          <p className="flex items-center justify-center gap-2 rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground shadow">
            <CalendarRange aria-hidden className="size-4 shrink-0" />
            {t('sleep.monthEmpty')}
          </p>
        ) : (
          // No night was logged this month, but the day was still journalled
          // with a mood — that data exists and the tile must say so, even
          // though every sleep-derived tile below genuinely has nothing to
          // show.
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
function Heading({ id, label }: { id: string; label: string }) {
  return (
    <h2
      id={id}
      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
    >
      <CalendarRange aria-hidden className="size-3.5 shrink-0" />
      {label}
    </h2>
  );
}
