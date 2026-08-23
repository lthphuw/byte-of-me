/**
 * Does sleep predict training output?
 *
 * Pure functions over plain arrays — no Prisma types, no I/O — the sibling of
 * `sleep-stats.ts`, `chronobiology.ts` and `workout-stats.ts`, and it inherits
 * their hard rule: **a measure refuses to answer when the data cannot support
 * it.** Here that rule does more work than anywhere else in the module. A
 * correlation is the one number a reader will act on, and one computed from a
 * fortnight of opportunistic self-logging looks exactly like one computed from
 * a year of it.
 *
 * **There is no p-value here, deliberately.** This is one person's
 * self-selected, unblinded, opportunistically-collected data with no control
 * over anything else that moved — a significance test on it would be a claim
 * the design cannot support, and its only practical effect would be to license
 * reading noise as a finding. The sample size travels with every coefficient
 * instead (`CorrelationResult.n`), so the caller can always state the number
 * of days the number rests on beside it.
 */
import { localDateKey } from './local-date';
import {
  volumeLoadKg,
  workingSets,
  type WorkoutSessionInput,
} from './workout-stats';

/**
 * Paired days required before any correlation is reported.
 *
 * Twenty is the floor from the approved spec. It is not a significance
 * threshold — see the file header, there is no test here — but a legibility
 * one: below roughly this many points a rank correlation is dominated by the
 * handful of days at the ends of the ranking, and a single week of illness can
 * move it across the whole −1…1 range. Twenty paired days is about a month of
 * ordinary training.
 */
export const CORRELATION_MIN_PAIRS = 20;

export interface NumericPair {
  x: number;
  y: number;
}

export interface CorrelationResult {
  /** Spearman's ρ, −1…1. */
  rho: number;
  /** Paired observations behind it. Always shown beside `rho`. */
  n: number;
}

/**
 * Fractional ("average") ranks, 1-based, in input order.
 *
 * Members of a tied group all receive the mean of the ranks the group spans:
 * three values tied across positions 2, 3 and 4 each get 3. This is the whole
 * correctness question in this file — see `spearmanRho` — and it is exported
 * so that it can be tested directly rather than only through a coefficient.
 */
export function averageRanks(values: number[]): number[] {
  const order = values.map((_, index) => index);
  order.sort((a, b) => values[a] - values[b]);

  const ranks = new Array<number>(values.length);

  let start = 0;
  while (start < order.length) {
    let end = start;
    while (
      end + 1 < order.length &&
      values[order[end + 1]] === values[order[start]]
    ) {
      end += 1;
    }

    // Ranks are 1-based, so positions start..end are ranks start+1..end+1 and
    // their mean is (start + end) / 2 + 1.
    const rank = (start + end) / 2 + 1;
    for (let i = start; i <= end; i += 1) ranks[order[i]] = rank;

    start = end + 1;
  }

  return ranks;
}

/**
 * Spearman's rank correlation.
 *
 * **Computed as Pearson's r applied to the average ranks**, not as the
 * shortcut `1 − 6Σd²/(n(n²−1))`. The shortcut is only equal to Spearman's ρ
 * when there are no ties, and ties are *guaranteed* in this data: sleep
 * durations land on five-minute boundaries because that is how the form is
 * filled in, RPE lands on halves because that is the scale, and "did training
 * happen" is a binary with only two distinct values. On a two-group binary of
 * twenty days the shortcut and the true value differ in the second decimal
 * place, and always in the optimistic direction.
 *
 *   ρ = Σ(rxᵢ − r̄x)(ryᵢ − r̄y) / √( Σ(rxᵢ − r̄x)² · Σ(ryᵢ − r̄y)² )
 *
 * Rank-based rather than Pearson on the raw values for two reasons that both
 * matter here: it assumes no linear relationship (more sleep plausibly helps
 * up to a point and then stops helping, which Pearson scores as a weak
 * association), and one 14-hour catch-up night after an illness cannot drag
 * the coefficient the way a raw outlier would.
 *
 * Returns null below `CORRELATION_MIN_PAIRS`, and null when either side has no
 * variance at all — twenty identical sleep durations, or a stretch in which
 * every logged day was a training day. There is no ranking to correlate in
 * that case; the shortcut formula would return a confident 1.
 */
export function spearmanRho(pairs: NumericPair[]): CorrelationResult | null {
  const n = pairs.length;
  if (n < CORRELATION_MIN_PAIRS) return null;

  const rx = averageRanks(pairs.map((p) => p.x));
  const ry = averageRanks(pairs.map((p) => p.y));

  const meanX = rx.reduce((a, b) => a + b, 0) / n;
  const meanY = ry.reduce((a, b) => a + b, 0) / n;

  let covariance = 0;
  let varianceX = 0;
  let varianceY = 0;

  for (let i = 0; i < n; i += 1) {
    const dx = rx[i] - meanX;
    const dy = ry[i] - meanY;
    covariance += dx * dy;
    varianceX += dx * dx;
    varianceY += dy * dy;
  }

  if (varianceX === 0 || varianceY === 0) return null;

  return { rho: covariance / Math.sqrt(varianceX * varianceY), n };
}

/** One night, reduced to the only thing this file predicts from. `SleepNight`
 *  from `sleep-stats.ts` satisfies it structurally. */
export interface SleepDuration {
  /** UTC midnight of the WAKE day, per the `localDate` convention. */
  localDate: Date;
  totalSleepMin: number;
}

/** One session's output, as the correlation consumes it. */
export interface TrainingDayOutput {
  /** UTC midnight of the day the session STARTED. */
  localDate: Date;
  /** Tonnage over working sets — `volumeLoadKg` from `workout-stats.ts`. */
  volumeLoadKg: number;
  /** Mean RPE across working sets that recorded one; null when none did. */
  meanRpe: number | null;
}

/**
 * Reduce a logged session to the two outputs sleep is tested against.
 *
 * Volume comes from `volumeLoadKg` rather than a second tonnage sum written
 * here — warm-up exclusion is the single most important correctness rule in
 * `workout-stats.ts`, and a private copy of it is how the tested version and
 * the shipped version drift apart.
 *
 * The effort side is the mean of the WORKING SETS' own RPEs, not
 * `WorkoutSession.sessionRpe`. Both exist; the set-level mean is chosen
 * because it is recorded while training rather than as one impression
 * afterwards, because it is present on sessions that were never formally
 * finished, and because it then comes off the same sets the volume does — so
 * a day is missing both numbers or neither, rather than dropping out of one
 * correlation and not the other. Foster's session-RPE remains what
 * `sessionLoad` and ACWR are built on; this is a different question.
 */
export function sessionTrainingOutput(
  session: WorkoutSessionInput
): TrainingDayOutput {
  const rpes: number[] = [];

  for (const exercise of session.exercises) {
    for (const set of workingSets(exercise)) {
      if (set.rpe !== null) rpes.push(set.rpe);
    }
  }

  return {
    localDate: session.localDate,
    volumeLoadKg: volumeLoadKg(session.exercises),
    meanRpe:
      rpes.length === 0 ? null : rpes.reduce((a, b) => a + b, 0) / rpes.length,
  };
}

/** One calendar day with a sleep record, and whatever training followed it. */
export interface JoinedDay {
  localDate: Date;
  totalSleepMin: number;
  /** Null when no session started on this day. NOT zero — see `joinSleepWithTraining`. */
  volumeLoadKg: number | null;
  meanRpe: number | null;
  trained: boolean;
}

export interface SleepTrainingJoin {
  /** Every day with a sleep record, oldest first. */
  days: JoinedDay[];
  /** Days with sleep AND at least one session. */
  pairedDays: number;
  /** Days with sleep and no session. */
  sleepOnlyDays: number;
  /** Days with a session whose night was never logged — no predictor, so they
   *  contribute to nothing and are reported only so a screen can say why the
   *  numbers do not add up to the training history it shows elsewhere. */
  sessionOnlyDays: number;
}

/**
 * Join the night before each session to that session's output.
 *
 * **The night before a workout on day D is the sleep row whose `localDate` IS
 * D — not D−1.** A sleep is keyed to the day it ENDED and a workout to the day
 * it STARTED (`local-date.ts`), so the asymmetry chosen at write time is
 * exactly what turns "last night's sleep versus today's training" into an
 * equality join on one column. Reaching back a day here is the off-by-one this
 * whole feature is built to avoid, and it would silently correlate every
 * session with the wrong night rather than fail.
 *
 * The universe is DAYS WITH A SLEEP RECORD. A day with a session but no logged
 * night has no predictor and cannot enter any measure. A day with sleep and no
 * session is kept, with `volumeLoadKg` null rather than 0: a rest day is not a
 * session that produced no tonnage, and coercing it to zero would invent
 * dozens of maximally-unproductive training days out of not training.
 *
 * Two sessions on one day are summed for volume and averaged for RPE — the
 * day is the unit both sides are keyed on, and a second session is more
 * training on the same night's sleep.
 */
export function joinSleepWithTraining(
  nights: SleepDuration[],
  sessions: TrainingDayOutput[]
): SleepTrainingJoin {
  const byDay = new Map<string, TrainingDayOutput[]>();
  for (const session of sessions) {
    const key = localDateKey(session.localDate);
    const existing = byDay.get(key);
    if (existing) existing.push(session);
    else byDay.set(key, [session]);
  }

  const days: JoinedDay[] = [];
  const matchedKeys = new Set<string>();

  for (const night of nights) {
    const key = localDateKey(night.localDate);
    const sameDay = byDay.get(key);

    if (!sameDay) {
      days.push({
        localDate: night.localDate,
        totalSleepMin: night.totalSleepMin,
        volumeLoadKg: null,
        meanRpe: null,
        trained: false,
      });
      continue;
    }

    matchedKeys.add(key);

    const rpes = sameDay
      .map((s) => s.meanRpe)
      .filter((rpe): rpe is number => rpe !== null);

    days.push({
      localDate: night.localDate,
      totalSleepMin: night.totalSleepMin,
      volumeLoadKg: sameDay.reduce((sum, s) => sum + s.volumeLoadKg, 0),
      meanRpe:
        rpes.length === 0
          ? null
          : rpes.reduce((a, b) => a + b, 0) / rpes.length,
      trained: true,
    });
  }

  days.sort((a, b) => a.localDate.getTime() - b.localDate.getTime());

  return {
    days,
    pairedDays: days.filter((d) => d.trained).length,
    sleepOnlyDays: days.filter((d) => !d.trained).length,
    sessionOnlyDays: [...byDay.keys()].filter((k) => !matchedKeys.has(k))
      .length,
  };
}

export interface SleepTrainingCorrelations {
  /** Sleep minutes against tonnage, over days that trained. */
  volumeLoad: CorrelationResult | null;
  /** Sleep minutes against mean working-set RPE, over days that trained and
   *  recorded an RPE. */
  meanRpe: CorrelationResult | null;
  /** Sleep minutes against whether training happened, over EVERY logged day. */
  trained: CorrelationResult | null;
}

/**
 * The three measures, from one join.
 *
 * They deliberately run over different sets of days, and the third is the
 * reason this is spelled out rather than left implicit:
 *
 * - **volume load** and **mean RPE** are conditional on having trained. A rest
 *   day has no output to correlate, so it is EXCLUDED; treating it as a
 *   zero-tonnage session would answer a different question ("does sleep
 *   predict output including the days you produced none"), and would answer it
 *   with a variable dominated by rest days.
 * - **trained** runs over every day with a sleep record, rest days included,
 *   scored 1/0. **Absence is the signal here** — the question is whether short
 *   nights precede skipped sessions, which cannot be asked of the training days
 *   alone. Days with no sleep record are still excluded from all three: an
 *   unlogged night is missing data, not a night of no sleep, and the app cannot
 *   tell a rest day the owner forgot to log from one that never happened.
 *
 * Mean RPE additionally drops training days where no working set recorded an
 * RPE, so it can fall below the floor and return null while volume still
 * answers.
 */
export function sleepTrainingCorrelations(
  join: SleepTrainingJoin
): SleepTrainingCorrelations {
  // `flatMap` rather than `filter(...).map(...)`: it narrows the nullable
  // output away without a type assertion, which `d.trained` alone cannot do.
  return {
    volumeLoad: spearmanRho(
      join.days.flatMap((d) =>
        d.volumeLoadKg === null
          ? []
          : [{ x: d.totalSleepMin, y: d.volumeLoadKg }]
      )
    ),
    meanRpe: spearmanRho(
      join.days.flatMap((d) =>
        d.meanRpe === null ? [] : [{ x: d.totalSleepMin, y: d.meanRpe }]
      )
    ),
    trained: spearmanRho(
      join.days.map((d) => ({ x: d.totalSleepMin, y: d.trained ? 1 : 0 }))
    ),
  };
}
