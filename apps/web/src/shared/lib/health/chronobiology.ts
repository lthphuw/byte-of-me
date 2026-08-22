/**
 * The chronobiology layer: sleep regularity, social jetlag, and the
 * sleep-corrected chronotype midpoint.
 *
 * Pure functions over plain arrays, like `sleep-stats.ts`, and separated from
 * it because these three share a property the others do not: **each one
 * refuses to answer when the data cannot support it.** Duration and debt
 * degrade gracefully from a single night; these need a run of consecutive days,
 * or a mix of free and work days, and returning a number anyway would be the
 * most confident-looking lie the module could tell.
 */

const DAY_MIN = 1440;
const DAY_MS = 86_400_000;

/** Minimum days of each kind before social jetlag and MSFsc will answer. */
const MIN_DAYS_PER_KIND = 3;

export interface SleepInterval {
  /** UTC midnight of the WAKE day, per the `localDate` convention. */
  localDate: Date;
  /** Minutes from that midnight to sleep onset — normally NEGATIVE. */
  onsetOffsetMin: number;
  /** Minutes from that midnight to waking — normally positive. */
  wakeOffsetMin: number;
}

export interface MidpointNight {
  /** Minutes past the local midnight opening the wake day. */
  midsleepMin: number;
  isFreeDay: boolean;
  totalSleepMin: number;
}

/**
 * Sleep Regularity Index (Phillips et al., 2017).
 *
 * The probability of being in the same sleep/wake state at the same CLOCK
 * MINUTE on two consecutive days, rescaled to −100…100. 100 is a sleeper who
 * repeats themselves exactly; 0 is a coin flip.
 *
 *   SRI = −100 + (200 / (M(N−1))) · Σᵢ Σⱼ δ(sᵢⱼ, sᵢ₊₁ⱼ),   M = 1440
 *
 * Why the minute grid rather than comparing durations: someone who sleeps
 * exactly 7h30 every night but begins at 22:00, then 01:00, then 23:00 is
 * profoundly irregular, and a duration-based measure calls them perfect.
 *
 * **A calendar day counts only when it is fully determined**, which needs BOTH
 * the sleep that ended on it and the sleep that started on it — i.e. records
 * for day d and day d+1. Without the second, the evening is unknown, and
 * treating unknown as awake would manufacture regularity out of missing data.
 * That is also why four nights are needed for two comparable pairs.
 *
 * Returns null when no consecutive pair of determined days exists.
 *
 * KNOWN BIAS, stated in the UI beside the number: computed from manual
 * bed/wake entry this reads HIGHER than actigraphy would. It cannot see naps,
 * and it does not know when the recorded awake minutes fell — the row stores
 * only a total. Bedtime and waketime standard deviation are displayed next to
 * it as the cruder measure that assumes nothing.
 */
export function sleepRegularityIndex(
  intervals: SleepInterval[]
): number | null {
  const byDay = new Map<number, SleepInterval>();
  for (const interval of intervals) {
    byDay.set(Math.round(interval.localDate.getTime() / DAY_MS), interval);
  }

  // Absolute local minutes spent asleep, on one continuous timeline.
  const asleep = new Set<number>();
  for (const [dayIndex, interval] of byDay) {
    const base = dayIndex * DAY_MIN;
    const from = Math.round(base + interval.onsetOffsetMin);
    const to = Math.round(base + interval.wakeOffsetMin);
    for (let minute = from; minute < to; minute += 1) asleep.add(minute);
  }

  const determined = new Set(
    [...byDay.keys()].filter((dayIndex) => byDay.has(dayIndex + 1))
  );

  let pairs = 0;
  let agreements = 0;

  for (const dayIndex of determined) {
    if (!determined.has(dayIndex + 1)) continue;
    pairs += 1;

    for (let minute = 0; minute < DAY_MIN; minute += 1) {
      const today = asleep.has(dayIndex * DAY_MIN + minute);
      const tomorrow = asleep.has((dayIndex + 1) * DAY_MIN + minute);
      if (today === tomorrow) agreements += 1;
    }
  }

  if (pairs === 0) return null;

  return -100 + (200 / (DAY_MIN * pairs)) * agreements;
}

export interface MidpointStats {
  /** Mean midsleep on free days, in minutes past midnight. Null with none. */
  msf: number | null;
  /** Mean midsleep on work days. */
  msw: number | null;
  /** Mean sleep duration on free days, in minutes. */
  sdFree: number | null;
  sdWork: number | null;
  freeCount: number;
  workCount: number;
}

/**
 * The free-day / work-day split every MCTQ measure below is built on.
 *
 * Exposed rather than kept private because the screen needs the COUNTS to
 * decide whether to render at all — "not enough free days yet" is a different
 * message from "no data".
 */
export function midpointStats(nights: MidpointNight[]): MidpointStats {
  const free = nights.filter((n) => n.isFreeDay);
  const work = nights.filter((n) => !n.isFreeDay);

  const mean = (values: number[]) =>
    values.length === 0
      ? null
      : values.reduce((a, b) => a + b, 0) / values.length;

  return {
    msf: mean(free.map((n) => n.midsleepMin)),
    msw: mean(work.map((n) => n.midsleepMin)),
    sdFree: mean(free.map((n) => n.totalSleepMin)),
    sdWork: mean(work.map((n) => n.totalSleepMin)),
    freeCount: free.length,
    workCount: work.length,
  };
}

/**
 * Social jetlag (Roenneberg): |MSF − MSW|, in minutes.
 *
 * The mismatch between the body clock and the schedule imposed on it — how far
 * the midpoint of sleep shifts when nothing forces a wake time.
 *
 * Unsigned on purpose. A sleeper who goes to bed EARLIER at the weekend is
 * still living against their schedule, and a signed value invites reading one
 * direction as healthy.
 *
 * Null below three days of either kind: a single unusual weekend would
 * otherwise set the figure on its own.
 */
export function socialJetlagMin(nights: MidpointNight[]): number | null {
  const { msf, msw, freeCount, workCount } = midpointStats(nights);

  if (
    msf === null ||
    msw === null ||
    freeCount < MIN_DAYS_PER_KIND ||
    workCount < MIN_DAYS_PER_KIND
  ) {
    return null;
  }

  return Math.abs(msf - msw);
}

/**
 * MSFsc — free-day midsleep corrected for sleep debt (MCTQ), in minutes past
 * midnight. The standard proxy for chronotype.
 *
 *   SD_week = (SD_w · n_w + SD_f · n_f) / (n_w + n_f)
 *   MSFsc   = MSF − (SD_f − SD_week) / 2      when SD_f > SD_w
 *           = MSF                             otherwise
 *
 * The correction exists because a free-day lie-in is partly catch-up rather
 * than chronotype: someone short of sleep all week sleeps later on Saturday for
 * reasons that say nothing about their body clock. When free days are not
 * longer than work days there is no debt to subtract, and MSF stands.
 *
 * **The published formula divides by 7**, which is correct only because the
 * questionnaire samples exactly one week. Our window is 14 days, where a
 * literal 7 would double `SD_week` and push the result badly negative.
 * `(n_w + n_f)` is the same quantity stated generally — a weighted mean of the
 * two duration means — and reduces to the published `/7` on a one-week sample.
 */
export function msfsc(nights: MidpointNight[]): number | null {
  const { msf, sdFree, sdWork, freeCount, workCount } = midpointStats(nights);

  if (msf === null || sdFree === null || sdWork === null) return null;
  if (freeCount === 0 || workCount === 0) return null;

  if (sdFree <= sdWork) return msf;

  const sdWeek =
    (sdWork * workCount + sdFree * freeCount) / (workCount + freeCount);

  return msf - (sdFree - sdWeek) / 2;
}
