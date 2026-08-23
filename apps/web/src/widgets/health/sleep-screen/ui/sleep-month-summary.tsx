import {
  CalendarCheck,
  CalendarRange,
  MoonStar,
  Star,
  Timer,
  TrendingDown,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { LoggedNight } from './sleep-day-editor';

import { splitMinutes } from '@/shared/lib/health/duration';
import { StatTile } from '@/shared/ui/stat-tile';

const HEADING_ID = 'sleep-month-summary-heading';

/** One decimal on the mean quality. A month of 3s and 4s averaging "4" hides
 *  the whole difference the figure exists to show, and a second decimal is
 *  precision the 1–5 input never had. */
const QUALITY_DECIMALS = 1;

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
 * reader happens to be looking at. Mean quality is local for a second reason —
 * quality is a subjective 1–5 the statistics module deliberately never reads.
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

  if (nights.length === 0) {
    return (
      <section aria-labelledby={HEADING_ID} className="flex flex-col gap-2">
        <Heading
          id={HEADING_ID}
          label={t('sleep.monthSummary', { monthLabel })}
        />
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <CalendarRange aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t('sleep.monthEmpty')}
        </p>
      </section>
    );
  }

  const durations = nights.map((night) => night.totalSleepMin);
  const meanDurationMin =
    durations.reduce((sum, value) => sum + value, 0) / durations.length;

  const longest = nights.reduce((best, night) =>
    night.totalSleepMin > best.totalSleepMin ? night : best
  );
  const shortest = nights.reduce((worst, night) =>
    night.totalSleepMin < worst.totalSleepMin ? night : worst
  );

  const onTarget = nights.filter(
    (night) => night.totalSleepMin >= targetMin
  ).length;

  // Rated nights only. Averaging an unrated night as a zero would invent the
  // worst possible rating for a night nobody judged, and averaging it as the
  // mean would make the figure depend on itself.
  const rated = nights.filter(
    (night): night is LoggedNight & { quality: number } =>
      night.quality !== null
  );
  const meanQuality =
    rated.length === 0
      ? null
      : rated.reduce((sum, night) => sum + night.quality, 0) / rated.length;

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
          value={nights.length}
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
                total: nights.length,
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

        <StatTile
          icon={Star}
          label={t('sleep.monthQuality')}
          value={
            meanQuality === null
              ? '—'
              : t('sleep.monthQualityValue', {
                  value: meanQuality.toFixed(QUALITY_DECIMALS),
                })
          }
          hint={
            meanQuality === null
              ? t('sleep.monthQualityUnavailable')
              : t('sleep.monthQualityContext', { n: rated.length })
          }
        />
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
