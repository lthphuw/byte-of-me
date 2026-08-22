/**
 * Sleep statistics. Pure functions over plain arrays — no Prisma types, no
 * I/O — which is what makes them the one place in this module where unit
 * tests genuinely pay.
 *
 * Nothing here is stored. A year of sleep is ~365 rows, and that never
 * justifies keeping derived columns in sync; the regularity measures need a
 * RUN of consecutive days rather than a single row anyway.
 */
import { addDays, localDateKey } from './local-date';

const MINUTE_MS = 60_000;
const DAY_MIN = 1440;

export interface SleepInput {
  localDate: Date;
  bedAt: Date;
  wakeAt: Date;
  latencyMin: number | null;
  awakeningsMin: number | null;
}

export interface SleepNight {
  localDate: Date;
  timeInBedMin: number;
  totalSleepMin: number;
  /** null when neither latency nor awakenings was recorded. */
  efficiencyPct: number | null;
  /** True when totalSleepMin fell back to timeInBedMin. */
  estimated: boolean;
  /** Minutes past local midnight of the sleep midpoint. */
  midsleepMin: number;
}

export function computeNight(input: SleepInput): SleepNight {
  const timeInBedMin = Math.max(
    0,
    Math.round((input.wakeAt.getTime() - input.bedAt.getTime()) / MINUTE_MS)
  );

  const measured = input.latencyMin !== null || input.awakeningsMin !== null;

  const totalSleepMin = Math.max(
    0,
    timeInBedMin - (input.latencyMin ?? 0) - (input.awakeningsMin ?? 0)
  );

  // WITHHELD, not 100%. With no latency and no awakenings recorded, "time
  // asleep" is just "time in bed" under another name, and printing 100%
  // invents a measurement that was never taken.
  const efficiencyPct =
    measured && timeInBedMin > 0 ? (totalSleepMin / timeInBedMin) * 100 : null;

  // Midpoint of SLEEP, not of time in bed: onset is when you actually fell
  // asleep. Expressed as minutes past the local midnight that opens the
  // localDate, so a 03:25 midpoint is 205 whether you went to bed at 21:00 or
  // at 02:00 — which is what makes it averageable across nights.
  const onsetMs = input.bedAt.getTime() + (input.latencyMin ?? 0) * MINUTE_MS;
  const midMs = onsetMs + (totalSleepMin / 2) * MINUTE_MS;
  const midsleepMin =
    ((Math.round((midMs - input.localDate.getTime()) / MINUTE_MS) % DAY_MIN) +
      DAY_MIN) %
    DAY_MIN;

  return {
    localDate: input.localDate,
    timeInBedMin,
    totalSleepMin,
    efficiencyPct,
    estimated: !measured,
    midsleepMin,
  };
}

/**
 * Rolling shortfall against the nightly target.
 *
 * A surplus night repays debt, but the total floors at zero: you cannot bank
 * sleep in advance, and a fortnight of long weekends must not read as credit
 * against the week ahead. This is a HEURISTIC and the UI labels it as one —
 * it is not a clinical measure.
 */
export function sleepDebtMin(
  nights: SleepNight[],
  targetMin: number,
  windowDays = 14
): number {
  if (nights.length === 0) return 0;

  const latest = nights.reduce(
    (max, n) => (n.localDate > max ? n.localDate : max),
    nights[0].localDate
  );
  const from = addDays(latest, -(windowDays - 1));

  const total = nights
    .filter((n) => n.localDate >= from && n.localDate <= latest)
    .reduce((sum, n) => sum + (targetMin - n.totalSleepMin), 0);

  return Math.max(0, total);
}

/**
 * Population standard deviation, in minutes.
 *
 * Reported beside SRI as the measure that makes no assumptions: SRI computed
 * from manual entry reads higher than reality because it cannot see naps and
 * does not know WHEN the recorded awake minutes fell. This one is cruder and
 * honest.
 */
export function minutesStdDev(values: number[]): number | null {
  if (values.length < 2) return null;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;

  return Math.sqrt(variance);
}

/**
 * Consecutive logged days, counted backwards.
 *
 * Starts at yesterday when today is not logged yet, rather than reporting
 * zero: the morning form is filled on waking, and a streak that resets every
 * midnight until you open the app is a streak nobody trusts.
 */
export function currentStreak(nights: SleepNight[], today: Date): number {
  const logged = new Set(nights.map((n) => localDateKey(n.localDate)));

  let cursor = logged.has(localDateKey(today)) ? today : addDays(today, -1);
  let streak = 0;

  while (logged.has(localDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}
