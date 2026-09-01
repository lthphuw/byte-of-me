/**
 * Contrasts, buckets, the weekly review and sleep debt. Pure functions over
 * plain arrays — no Prisma, no I/O, no message keys.
 * Never emits a coefficient, a p-value or a composite score.
 */
import { unwrapNearMidnight } from './sleep-stats';

/** How far back a contrast may look. WHOOP's window; beyond it a habit the
 *  owner has since dropped keeps voting. */
export const INSIGHT_WINDOW_DAYS = 90;

/** Nights required on EACH side before a contrast is shown. Bearable ships
 *  3-and-3 and a support page titled "my correlations are wrong". */
export const MIN_NIGHTS_PER_SIDE = 5;

/** Showing everything computed is how a surface stops being trusted. */
export const MAX_CONTRASTS = 3;

export const DEBT_WINDOW_NIGHTS = 14;

/** Geometric decay across the debt window. Chosen so the most recent night
 *  carries ~15% of the total weight over 14 nights. */
export const DEBT_DECAY = 0.872;

/** Bucket edges, in minutes. Negative affect rises below ~7.5h and again
 *  above ~10.5h, so a fitted line would claim more is monotonically better. */
export const SHORT_NIGHT_MIN = 360;
export const LONG_NIGHT_MIN = 450;

/** One night, joined to the day it woke into. `mood` comes from the DayEntry
 *  with the SAME localDate: a night dated D is the sleep that produced day D.
 *  The reverse pairing is not supported by the literature. */
export interface InsightNight {
  localDate: string;
  totalSleepMin: number;
  efficiencyPct: number | null;
  midsleepMin: number;
  isFreeDay: boolean;
  napBucket: string | null;
  factors: string[];
  quality: number | null;
  restedness: number | null;
  mood: number | null;
}

/** Ranked by how directly each answers "how did the night go". All three are
 *  1–5, so an absolute effect is comparable across them. */
export type InsightOutcome = 'restedness' | 'quality' | 'mood';

const OUTCOME_PRIORITY: readonly InsightOutcome[] = [
  'restedness',
  'quality',
  'mood',
];

export interface FactorContrast {
  factor: string;
  outcome: InsightOutcome;
  withN: number;
  withMean: number;
  withoutN: number;
  withoutMean: number;
  /** `withMean − withoutMean`. Signed, so the copy can state a direction. */
  delta: number;
}

export interface FactorProgress {
  factor: string;
  outcome: InsightOutcome;
  withN: number;
  withoutN: number;
  /** Nights still missing across both sides — never a blank, always a count. */
  nightsNeeded: number;
}

export interface ContrastReport {
  contrasts: FactorContrast[];
  progress: FactorProgress[];
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Nights missing an outcome are dropped, not zero-filled: the printed n is
 *  the n of the mean beside it, which is the whole discipline here. */
function split(
  nights: InsightNight[],
  factor: string,
  outcome: InsightOutcome
): { present: number[]; absent: number[] } {
  const present: number[] = [];
  const absent: number[] = [];

  for (const night of nights) {
    const value = night[outcome];
    if (value === null) continue;
    (night.factors.includes(factor) ? present : absent).push(value);
  }

  return { present, absent };
}

function nightsNeeded(withN: number, withoutN: number): number {
  return (
    Math.max(0, MIN_NIGHTS_PER_SIDE - withN) +
    Math.max(0, MIN_NIGHTS_PER_SIDE - withoutN)
  );
}

/**
 * The contrast of means for every factor, gated, ranked and capped.
 *
 * One outcome per factor — the first in priority order that clears the gate —
 * so a factor cannot occupy the top three three times over.
 */
export function rankedContrasts(
  nights: InsightNight[],
  factors: readonly string[]
): ContrastReport {
  const contrasts: FactorContrast[] = [];
  const progress: FactorProgress[] = [];

  for (const factor of factors) {
    const attempts = OUTCOME_PRIORITY.map((outcome) => {
      const { present, absent } = split(nights, factor, outcome);
      return { outcome, present, absent };
    });

    const cleared = attempts.find(
      (a) =>
        a.present.length >= MIN_NIGHTS_PER_SIDE &&
        a.absent.length >= MIN_NIGHTS_PER_SIDE
    );

    if (cleared) {
      const withMean = mean(cleared.present);
      const withoutMean = mean(cleared.absent);

      contrasts.push({
        factor,
        outcome: cleared.outcome,
        withN: cleared.present.length,
        withMean,
        withoutN: cleared.absent.length,
        withoutMean,
        delta: withMean - withoutMean,
      });
      continue;
    }

    // The closest attempt, and only for a factor the owner has actually
    // ticked: "0 nights with, 30 without" is not progress towards anything.
    const best = attempts
      .filter((a) => a.present.length > 0)
      .sort(
        (a, b) =>
          nightsNeeded(a.present.length, a.absent.length) -
          nightsNeeded(b.present.length, b.absent.length)
      )[0];

    if (best) {
      progress.push({
        factor,
        outcome: best.outcome,
        withN: best.present.length,
        withoutN: best.absent.length,
        nightsNeeded: nightsNeeded(best.present.length, best.absent.length),
      });
    }
  }

  return {
    contrasts: contrasts
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, MAX_CONTRASTS),
    progress: progress
      .sort((a, b) => a.nightsNeeded - b.nightsNeeded)
      .slice(0, MAX_CONTRASTS),
  };
}

export type DurationBucketId = 'lt6' | 'mid' | 'gt7h30';

export interface DurationBucket {
  id: DurationBucketId;
  n: number;
  meanMood: number | null;
}

/** Edges are closed on the middle bucket: exactly 6h and exactly 7h30 both
 *  belong to it. */
export function durationBucketId(totalSleepMin: number): DurationBucketId {
  if (totalSleepMin < SHORT_NIGHT_MIN) return 'lt6';
  if (totalSleepMin > LONG_NIGHT_MIN) return 'gt7h30';

  return 'mid';
}

const BUCKET_ORDER: readonly DurationBucketId[] = ['lt6', 'mid', 'gt7h30'];

/** All three buckets always, so an empty one reads as "nothing here yet"
 *  rather than vanishing and making the other two look like the whole range. */
export function moodByDuration(nights: InsightNight[]): DurationBucket[] {
  return BUCKET_ORDER.map((id) => {
    const moods = nights
      .filter((n) => n.mood !== null && durationBucketId(n.totalSleepMin) === id)
      .map((n) => n.mood as number);

    return {
      id,
      n: moods.length,
      meanMood: moods.length === 0 ? null : mean(moods),
    };
  });
}

export interface WeekMeans {
  nights: number;
  meanDurationMin: number | null;
  meanMidsleepMin: number | null;
  meanEfficiencyPct: number | null;
  meanMood: number | null;
}

export type WeeklyObservationKind =
  | 'duration'
  | 'midsleep'
  | 'efficiency'
  | 'mood';

export interface WeeklyObservation {
  kind: WeeklyObservationKind;
  /** `recent − previous`, in the kind's own unit. */
  delta: number;
}

export interface WeeklyReview {
  recent: WeekMeans;
  previous: WeekMeans;
  /** The night the owner rated highest, or the longest one when restedness is
   *  too sparse to rank by. Never a composite. */
  best: { localDate: string; value: number } | null;
  worst: { localDate: string; value: number } | null;
  rankedBy: 'restedness' | 'duration';
  observation: WeeklyObservation | null;
}

/** The smallest move worth a sentence, per metric. A delta is ranked by how
 *  many of its own units it covers, which is what makes four units comparable. */
const OBSERVATION_UNIT: Record<WeeklyObservationKind, number> = {
  duration: 30,
  midsleep: 30,
  efficiency: 5,
  mood: 0.5,
};

/** At least two nights rated before restedness may order a week. */
const MIN_RATED_FOR_RANKING = 2;

function meanOrNull(values: Array<number | null>): number | null {
  const present = values.filter((v): v is number => v !== null);

  return present.length === 0 ? null : mean(present);
}

function dayOffset(key: string, endKey: string): number {
  const ms =
    Date.parse(`${endKey}T00:00:00.000Z`) - Date.parse(`${key}T00:00:00.000Z`);

  return Math.round(ms / 86_400_000);
}

function weekMeans(nights: InsightNight[]): WeekMeans {
  return {
    nights: nights.length,
    meanDurationMin: meanOrNull(nights.map((n) => n.totalSleepMin)),
    meanMidsleepMin: meanOrNull(
      nights.map((n) => unwrapNearMidnight(n.midsleepMin))
    ),
    meanEfficiencyPct: meanOrNull(nights.map((n) => n.efficiencyPct)),
    meanMood: meanOrNull(nights.map((n) => n.mood)),
  };
}

function pickObservation(
  recent: WeekMeans,
  previous: WeekMeans
): WeeklyObservation | null {
  const pairs: Array<[WeeklyObservationKind, number | null, number | null]> = [
    ['duration', recent.meanDurationMin, previous.meanDurationMin],
    ['midsleep', recent.meanMidsleepMin, previous.meanMidsleepMin],
    ['efficiency', recent.meanEfficiencyPct, previous.meanEfficiencyPct],
    ['mood', recent.meanMood, previous.meanMood],
  ];

  const ranked = pairs
    .filter(([, a, b]) => a !== null && b !== null)
    .map(([kind, a, b]) => ({
      kind,
      delta: (a as number) - (b as number),
      units: Math.abs((a as number) - (b as number)) / OBSERVATION_UNIT[kind],
    }))
    .filter((o) => o.units >= 1)
    .sort((a, b) => b.units - a.units);

  return ranked.length === 0
    ? null
    : { kind: ranked[0].kind, delta: ranked[0].delta };
}

/** Last seven nights against the seven before them, plus exactly one
 *  observation — the largest move relative to what counts as a move. */
export function weeklyReview(
  nights: InsightNight[],
  endKey: string
): WeeklyReview {
  const offsets = nights.map((n) => ({ n, d: dayOffset(n.localDate, endKey) }));
  const recentNights = offsets.filter((o) => o.d >= 0 && o.d <= 6).map((o) => o.n);
  const previousNights = offsets
    .filter((o) => o.d >= 7 && o.d <= 13)
    .map((o) => o.n);

  const rated = recentNights.filter((n) => n.restedness !== null);
  const rankedBy =
    rated.length >= MIN_RATED_FOR_RANKING ? 'restedness' : 'duration';

  const scored = (rankedBy === 'restedness' ? rated : recentNights).map((n) => ({
    localDate: n.localDate,
    value: rankedBy === 'restedness' ? (n.restedness as number) : n.totalSleepMin,
  }));
  const sorted = [...scored].sort((a, b) => b.value - a.value);

  const recent = weekMeans(recentNights);
  const previous = weekMeans(previousNights);

  return {
    recent,
    previous,
    best: sorted[0] ?? null,
    worst: sorted.length > 1 ? sorted[sorted.length - 1] : null,
    rankedBy,
    observation: pickObservation(recent, previous),
  };
}

export interface SleepDebt {
  debtMin: number;
  needMin: number;
  needSource: 'freeDayP90' | 'target';
  /** The free-day estimate itself, even when the target won. Null below the
   *  gate. */
  freeDayP90Min: number | null;
  freeDayCount: number;
  nightsCounted: number;
  /** Nights in the window with a nap over an hour. Carried so the screen can
   *  SAY the nap was not deducted rather than deducting it silently. */
  longNapNights: number;
}

/** Nearest-rank P90 of free-day total sleep time, floored at the owner's own
 *  target. Below the gate, or below the target, the target is the need. */
export function sleepNeedMin(
  nights: InsightNight[],
  targetMin: number
): Pick<SleepDebt, 'needMin' | 'needSource' | 'freeDayP90Min' | 'freeDayCount'> {
  const freeDays = nights
    .filter((n) => n.isFreeDay)
    .map((n) => n.totalSleepMin)
    .sort((a, b) => a - b);

  if (freeDays.length < MIN_NIGHTS_PER_SIDE) {
    return {
      needMin: targetMin,
      needSource: 'target',
      freeDayP90Min: null,
      freeDayCount: freeDays.length,
    };
  }

  const p90 = freeDays[Math.ceil(0.9 * freeDays.length) - 1];

  return {
    needMin: Math.max(targetMin, p90),
    needSource: p90 > targetMin ? 'freeDayP90' : 'target',
    freeDayP90Min: p90,
    freeDayCount: freeDays.length,
  };
}

/**
 * Recency-weighted shortfall over the last 14 nights.
 *
 * Weighted by how many days ago the night was, not by its rank among the
 * nights present, so an unlogged night does not promote its neighbour.
 */
export function sleepDebt(
  nights: InsightNight[],
  endKey: string,
  targetMin: number,
  windowNights = DEBT_WINDOW_NIGHTS
): SleepDebt {
  const need = sleepNeedMin(nights, targetMin);

  const inWindow = nights
    .map((n) => ({ n, d: dayOffset(n.localDate, endKey) }))
    .filter((o) => o.d >= 0 && o.d < windowNights);

  if (inWindow.length === 0) {
    return { ...need, debtMin: 0, nightsCounted: 0, longNapNights: 0 };
  }

  const weights = inWindow.map((o) => DEBT_DECAY ** o.d);
  const total = weights.reduce((a, b) => a + b, 0);

  // Scaled by the nights actually seen, never by the window: a fortnight with
  // three nights in it must not be extrapolated up to fourteen.
  const weightedMean = inWindow.reduce(
    (sum, o, i) => sum + (weights[i] / total) * (need.needMin - o.n.totalSleepMin),
    0
  );

  return {
    ...need,
    debtMin: Math.max(0, Math.round(weightedMean * inWindow.length)),
    nightsCounted: inWindow.length,
    longNapNights: inWindow.filter((o) => o.n.napBucket === 'gt60').length,
  };
}

/**
 * Join nights to the days they woke into.
 *
 * A night dated D pairs with the DayEntry dated D — `localDate` is the day of
 * WAKING, so this is last night's sleep against today's mood.
 */
export function pairNightsWithMood(
  nights: Array<Omit<InsightNight, 'mood'>>,
  moodByDay: ReadonlyMap<string, number | null>
): InsightNight[] {
  return nights.map((night) => ({
    ...night,
    mood: moodByDay.get(night.localDate) ?? null,
  }));
}
