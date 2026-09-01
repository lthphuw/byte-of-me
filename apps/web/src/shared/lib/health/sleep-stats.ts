/**
 * Sleep statistics. Pure functions over plain arrays — no Prisma types, no
 * I/O — which is what makes them the one place in this module where unit
 * tests genuinely pay.
 *
 * Nothing here is stored. A year of sleep is ~365 rows, and that never
 * justifies keeping derived columns in sync; the regularity measures need a
 * RUN of consecutive days rather than a single row anyway.
 *
 * **Naps are recorded and never counted.** `napBucket` is carried onto every
 * night and enters no figure here — not duration, not efficiency, not debt.
 * It is an ordered id, not minutes: `gt60` is open at the top, so any number
 * derived from it would be invented, and adding one to a night's total would
 * inflate both the duration the reader sees and the efficiency computed from
 * it — silently, and in the flattering direction. Debt therefore measures the
 * NIGHT against the nightly target, which is what the target means. Whether a
 * long nap should repay debt is a question for the insight phase, with the
 * bucket in hand and the choice stated on screen.
 */
import { addDays, localDateKey } from './local-date';

const MINUTE_MS = 60_000;
const DAY_MIN = 1440;

export interface SleepInput {
  localDate: Date;
  bedAt: Date;
  wakeAt: Date;
  /** Out of bed. Null on rows written before the column existed. */
  riseAt?: Date | null;
  latencyMin: number | null;
  awakeningsMin: number | null;
  awakeningsCount?: number | null;
  napBucket?: string | null;
}

export interface SleepNight {
  localDate: Date;
  /** `rise − bed`, falling back to `wake − bed` when `riseAt` is null. */
  timeInBedMin: number;
  /** `wake − bed`. The opportunity to sleep, which is what latency and the
   *  awake minutes are subtracted from — the lie-in never was. */
  sleepWindowMin: number;
  totalSleepMin: number;
  /** null when neither latency nor awakenings was recorded. */
  efficiencyPct: number | null;
  /** True when totalSleepMin fell back to the whole sleep window. */
  estimated: boolean;
  /** True when time in bed had to fall back to `wake − bed`. */
  riseEstimated: boolean;
  /** Minutes past local midnight of the sleep midpoint. */
  midsleepMin: number;
  awakeningsCount: number | null;
  /** Carried, never counted — see the module note on naps. */
  napBucket: string | null;
}

/**
 * One night's derived figures.
 *
 * Two different spans, and conflating them is what made efficiency wrong:
 *   TIB = rise − bed          (time in bed, ends when you get up)
 *   TST = (wake − bed) − latency − awake
 *   SE  = TST / TIB
 *
 * The lie-in between waking and rising counts against efficiency but was never
 * an opportunity to sleep, which is why TST is measured from the sleep window
 * and not from TIB. With no `riseAt` the two spans coincide and the figure is
 * exactly what it was before the column existed.
 */
export function computeNight(input: SleepInput): SleepNight {
  const sleepWindowMin = Math.max(
    0,
    Math.round((input.wakeAt.getTime() - input.bedAt.getTime()) / MINUTE_MS)
  );

  const riseAt = input.riseAt ?? null;
  const timeInBedMin =
    riseAt === null
      ? sleepWindowMin
      : Math.max(
          sleepWindowMin,
          Math.round((riseAt.getTime() - input.bedAt.getTime()) / MINUTE_MS)
        );

  const measured = input.latencyMin !== null || input.awakeningsMin !== null;

  const totalSleepMin = Math.max(
    0,
    sleepWindowMin - (input.latencyMin ?? 0) - (input.awakeningsMin ?? 0)
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
    sleepWindowMin,
    totalSleepMin,
    efficiencyPct,
    estimated: !measured,
    riseEstimated: riseAt === null,
    midsleepMin,
    awakeningsCount: input.awakeningsCount ?? null,
    napBucket: input.napBucket ?? null,
  };
}

/**
 * How a figure reads against the National Sleep Foundation's consensus
 * (Ohayon et al., Sleep Health 3(1), 2017). Three bands, no composite score:
 * a single number hides which input moved, and orthosomnia is a documented
 * harm of tracker scores.
 */
export type SleepBand = 'good' | 'fair' | 'poor';

/** Every threshold on one screen, so the UI never hardcodes one. */
export const SLEEP_THRESHOLDS = {
  efficiencyPct: { good: 85, poor: 75 },
  latencyMin: { good: 30, poor: 46 },
  awakeMin: { good: 20, poor: 40 },
  awakeningsCount: { good: 1, poor: 4 },
} as const;

/** Higher is better: at or above `good` is good, below `poor` is poor. */
function bandAscending(
  value: number | null,
  bounds: { good: number; poor: number }
): SleepBand | null {
  if (value === null) return null;
  if (value >= bounds.good) return 'good';
  if (value < bounds.poor) return 'poor';

  return 'fair';
}

/** Lower is better: at or below `good` is good, above `poor` is poor. */
function bandDescending(
  value: number | null,
  bounds: { good: number; poor: number }
): SleepBand | null {
  if (value === null) return null;
  if (value <= bounds.good) return 'good';
  if (value > bounds.poor) return 'poor';

  return 'fair';
}

export function efficiencyBand(pct: number | null): SleepBand | null {
  return bandAscending(pct, SLEEP_THRESHOLDS.efficiencyPct);
}

export function latencyBand(minutes: number | null): SleepBand | null {
  return bandDescending(minutes, SLEEP_THRESHOLDS.latencyMin);
}

export function awakeMinutesBand(minutes: number | null): SleepBand | null {
  return bandDescending(minutes, SLEEP_THRESHOLDS.awakeMin);
}

export function awakeningsCountBand(count: number | null): SleepBand | null {
  return bandDescending(count, SLEEP_THRESHOLDS.awakeningsCount);
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
