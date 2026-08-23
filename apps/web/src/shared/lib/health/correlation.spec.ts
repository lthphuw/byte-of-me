/**
 * What this spec defends: the rank correlation is the tie-corrected form (a
 * naive `1 − 6Σd²/…` must fail it), it refuses to answer below the sample
 * floor, it scores a monotone-but-nonlinear relationship as a perfect 1 —
 * which is the whole reason Spearman is used here rather than Pearson — and
 * the sleep→training join pairs a session with the sleep that ENDED on the
 * session's own day, not the day before.
 *
 * Every expected value states its arithmetic beside it.
 */
import { describe, expect, it } from 'bun:test';

import {
  averageRanks,
  CORRELATION_MIN_PAIRS,
  joinSleepWithTraining,
  type NumericPair,
  sessionTrainingOutput,
  sleepTrainingCorrelations,
  spearmanRho,
  type TrainingDayOutput,
} from './correlation';
import type { PerformedExercise } from './workout-stats';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** `n` pairs from two parallel arrays. */
const pairs = (xs: number[], ys: number[]): NumericPair[] =>
  xs.map((x, i) => ({ x, y: ys[i] }));

const upTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe('averageRanks', () => {
  it('ranks distinct values 1..n in value order, not input order', () => {
    expect(averageRanks([30, 10, 20])).toEqual([3, 1, 2]);
  });

  it('gives every member of a tied group the mean of the ranks it spans', () => {
    // Sorted: 5, 7, 7, 7, 9 -> positions 1, (2,3,4), 5.
    // The three 7s share ranks 2..4, mean (2+3+4)/3 = 3.
    expect(averageRanks([5, 7, 7, 7, 9])).toEqual([1, 3, 3, 3, 5]);
  });

  it('averages a two-way tie to a half rank', () => {
    // Sorted: 1, 1, 3 -> the two 1s share ranks 1 and 2, mean 1.5.
    expect(averageRanks([1, 3, 1])).toEqual([1.5, 3, 1.5]);
  });
});

describe('spearmanRho', () => {
  it('refuses to answer below the paired-day floor', () => {
    const n = CORRELATION_MIN_PAIRS - 1;
    expect(spearmanRho(pairs(upTo(n), upTo(n)))).toBeNull();
  });

  it('answers at exactly the floor', () => {
    const n = CORRELATION_MIN_PAIRS;
    const result = spearmanRho(pairs(upTo(n), upTo(n)));

    expect(result).not.toBeNull();
    expect(result?.n).toBe(n);
    expect(result?.rho).toBeCloseTo(1, 12);
  });

  it('scores a monotone but strongly NONLINEAR relationship as exactly 1', () => {
    // y = 2^x over 20 points. Pearson's r on these is roughly 0.6 because the
    // cloud is a hockey stick; the ranks are identical, so Spearman is 1. This
    // is the reason the module uses ranks at all.
    const xs = upTo(20);
    const ys = xs.map((x) => 2 ** x);

    expect(spearmanRho(pairs(xs, ys))?.rho).toBeCloseTo(1, 12);
  });

  it('scores a perfectly reversed order as -1', () => {
    const xs = upTo(20);
    expect(spearmanRho(pairs(xs, [...xs].reverse()))?.rho).toBeCloseTo(-1, 12);
  });

  it('handles heavy ties with average ranks, where the naive formula is wrong', () => {
    // Ten 1s then ten 2s against y = 1..20.
    //
    //   rank(x) = 5.5 for the first ten, 15.5 for the second ten; rank(y) = i.
    //   Mean rank = 10.5 on both sides.
    //   Sxx = 20 * 5^2                                = 500
    //   Syy = n(n^2-1)/12 = 20*399/12                 = 665
    //   Sxy = -5*(-50) + 5*(50)                       = 500
    //   rho = 500 / sqrt(500*665) = sqrt(500/665)     = 0.8671100...
    //
    // The naive shortcut disagrees in the second decimal place:
    //   Sum d^2 = 2 * 2 * (0.5^2+1.5^2+2.5^2+3.5^2+4.5^2) = 165
    //   1 - 6*165/(20*399) = 1 - 990/7980              = 0.8759398...
    const xs = [...Array(10).fill(1), ...Array(10).fill(2)];
    const result = spearmanRho(pairs(xs, upTo(20)));

    expect(result?.rho).toBeCloseTo(Math.sqrt(500 / 665), 12);
    expect(result?.rho).toBeCloseTo(0.86711, 5);
    // Guards the point of the test: the naive value must NOT satisfy it.
    expect(result?.rho).not.toBeCloseTo(0.87594, 3);
  });

  it('returns null when one side never varies', () => {
    // Twenty identical sleep durations have no ranking to correlate. The naive
    // formula happily returns 1 here (every d is 0), which would put a perfect
    // correlation on screen for a variable that never moved.
    const result = spearmanRho(pairs(Array(20).fill(420), upTo(20)));

    expect(result).toBeNull();
  });
});

describe('sessionTrainingOutput', () => {
  const exercise = (
    sets: PerformedExercise['sets'],
    metric: PerformedExercise['metric'] = 'weight_reps'
  ): PerformedExercise => ({
    exerciseId: 'squat',
    metric,
    primaryMuscle: 'quads',
    secondaryMuscles: [],
    sets,
  });

  const set = (
    reps: number,
    weightKg: number,
    rpe: number | null,
    isWarmup = false
  ) => ({ reps, weightKg, rpe, durationSec: null, isWarmup });

  it('sums tonnage over working sets and means their RPE', () => {
    const output = sessionTrainingOutput({
      localDate: day('2026-08-10'),
      sessionRpe: null,
      durationMin: null,
      exercises: [exercise([set(5, 100, 8), set(5, 100, 9)])],
    });

    // 5*100 + 5*100 = 1000 kg; (8 + 9) / 2 = 8.5.
    expect(output.volumeLoadKg).toBe(1000);
    expect(output.meanRpe).toBe(8.5);
  });

  it('excludes warm-ups from both the tonnage and the mean RPE', () => {
    const output = sessionTrainingOutput({
      localDate: day('2026-08-10'),
      sessionRpe: null,
      durationMin: null,
      exercises: [exercise([set(10, 40, 3, true), set(5, 100, 9)])],
    });

    // The 400 kg warm-up and its RPE 3 are not training output.
    expect(output.volumeLoadKg).toBe(500);
    expect(output.meanRpe).toBe(9);
  });

  it('withholds mean RPE when no working set recorded one', () => {
    const output = sessionTrainingOutput({
      localDate: day('2026-08-10'),
      sessionRpe: null,
      durationMin: null,
      exercises: [exercise([set(5, 100, null)])],
    });

    expect(output.volumeLoadKg).toBe(500);
    expect(output.meanRpe).toBeNull();
  });
});

describe('joinSleepWithTraining', () => {
  const output = (
    iso: string,
    volumeLoadKg: number,
    meanRpe: number | null = null
  ): TrainingDayOutput => ({ localDate: day(iso), volumeLoadKg, meanRpe });

  it('pairs a session with the sleep that ENDED on the session day', () => {
    // The night before training on the 11th is the sleep whose localDate IS
    // the 11th, because a sleep is keyed to its WAKE day. An implementation
    // that reaches back to the 10th would read 300 here.
    const join = joinSleepWithTraining(
      [
        { localDate: day('2026-08-10'), totalSleepMin: 300 },
        { localDate: day('2026-08-11'), totalSleepMin: 500 },
      ],
      [output('2026-08-11', 1000)]
    );

    const trainingDay = join.days.find(
      (d) => d.localDate.getTime() === day('2026-08-11').getTime()
    );

    expect(trainingDay?.totalSleepMin).toBe(500);
    expect(trainingDay?.volumeLoadKg).toBe(1000);
    // And the previous day must be a rest day, not the pair.
    expect(
      join.days.find(
        (d) => d.localDate.getTime() === day('2026-08-10').getTime()
      )?.volumeLoadKg
    ).toBeNull();
  });

  it('sums two sessions on one day and means their recorded RPE', () => {
    const join = joinSleepWithTraining(
      [{ localDate: day('2026-08-11'), totalSleepMin: 480 }],
      [output('2026-08-11', 1000, 8), output('2026-08-11', 500, 6)]
    );

    expect(join.days[0].volumeLoadKg).toBe(1500);
    expect(join.days[0].meanRpe).toBe(7);
  });

  it('counts the three kinds of day so a screen can explain a null', () => {
    const join = joinSleepWithTraining(
      [
        { localDate: day('2026-08-10'), totalSleepMin: 400 },
        { localDate: day('2026-08-11'), totalSleepMin: 500 },
      ],
      [output('2026-08-11', 1000), output('2026-08-12', 900)]
    );

    expect(join.pairedDays).toBe(1);
    expect(join.sleepOnlyDays).toBe(1);
    // The 12th trained but its night is unlogged: no predictor, no pair.
    expect(join.sessionOnlyDays).toBe(1);
    expect(join.days).toHaveLength(2);
  });

  it('returns days oldest first', () => {
    const join = joinSleepWithTraining(
      [
        { localDate: day('2026-08-12'), totalSleepMin: 400 },
        { localDate: day('2026-08-10'), totalSleepMin: 500 },
      ],
      []
    );

    expect(join.days.map((d) => d.localDate.getTime())).toEqual([
      day('2026-08-10').getTime(),
      day('2026-08-12').getTime(),
    ]);
  });

  it('returns a usable, empty join for no history at all', () => {
    const join = joinSleepWithTraining([], []);

    expect(join.days).toEqual([]);
    expect(join.pairedDays).toBe(0);
    expect(join.sleepOnlyDays).toBe(0);
    expect(join.sessionOnlyDays).toBe(0);
  });
});

describe('sleepTrainingCorrelations', () => {
  /** `n` consecutive days from 2026-06-01, sleeping `sleepMin(i)` minutes. */
  const nightsFrom = (n: number, sleepMin: (i: number) => number) =>
    Array.from({ length: n }, (_, i) => ({
      localDate: new Date(Date.UTC(2026, 5, 1 + i)),
      totalSleepMin: sleepMin(i),
    }));

  const sessionOn = (
    i: number,
    volumeLoadKg: number,
    meanRpe: number | null = null
  ): TrainingDayOutput => ({
    localDate: new Date(Date.UTC(2026, 5, 1 + i)),
    volumeLoadKg,
    meanRpe,
  });

  it('withholds every measure until the floor is reached', () => {
    const n = CORRELATION_MIN_PAIRS - 1;
    const join = joinSleepWithTraining(
      nightsFrom(n, (i) => 360 + i * 5),
      Array.from({ length: n }, (_, i) => sessionOn(i, 1000 + i * 10, 7))
    );

    const result = sleepTrainingCorrelations(join);

    expect(join.pairedDays).toBe(n);
    expect(result.volumeLoad).toBeNull();
    expect(result.meanRpe).toBeNull();
    expect(result.trained).toBeNull();
  });

  it('correlates sleep with volume load over the days that have both', () => {
    const n = CORRELATION_MIN_PAIRS;
    // Longer sleep, more tonnage — monotone, so rho is 1 whatever the shape.
    const join = joinSleepWithTraining(
      nightsFrom(n, (i) => 360 + i * 5),
      Array.from({ length: n }, (_, i) => sessionOn(i, 500 + i * i * 20, 7))
    );

    const result = sleepTrainingCorrelations(join);

    expect(result.volumeLoad?.n).toBe(n);
    expect(result.volumeLoad?.rho).toBeCloseTo(1, 12);
  });

  it('excludes rest days from volume and RPE but counts them for "trained"', () => {
    // 20 slept-and-trained days, then 20 slept-and-rested days. Volume and RPE
    // see only the first 20; "did training happen" sees all 40, because the
    // absence of a session IS the observation there.
    const trained = CORRELATION_MIN_PAIRS;
    const rested = CORRELATION_MIN_PAIRS;

    const join = joinSleepWithTraining(
      nightsFrom(trained + rested, (i) => (i < trained ? 480 + i : 300 + i)),
      // RPE on halves, repeating — the tie pattern the real scale produces,
      // and varied so the measure is not withheld for zero variance.
      Array.from({ length: trained }, (_, i) =>
        sessionOn(i, 1000 + i * 10, 6 + (i % 5) * 0.5)
      )
    );

    const result = sleepTrainingCorrelations(join);

    expect(result.volumeLoad?.n).toBe(trained);
    expect(result.meanRpe?.n).toBe(trained);
    expect(result.trained?.n).toBe(trained + rested);
  });

  it('finds a negative association when short nights precede training', () => {
    // Sleep falls as the days go on; training happens only on the last 20 of
    // 40 days. Short sleep therefore coincides with training, so the "did
    // training happen" correlation must be negative.
    const n = CORRELATION_MIN_PAIRS * 2;
    const join = joinSleepWithTraining(
      nightsFrom(n, (i) => 600 - i * 5),
      Array.from({ length: CORRELATION_MIN_PAIRS }, (_, i) =>
        sessionOn(CORRELATION_MIN_PAIRS + i, 1000, 7)
      )
    );

    const result = sleepTrainingCorrelations(join);

    expect(result.trained?.rho).toBeLessThan(0);
  });

  it('withholds mean RPE while volume still answers, when RPE went unlogged', () => {
    const n = CORRELATION_MIN_PAIRS;
    const join = joinSleepWithTraining(
      nightsFrom(n, (i) => 360 + i * 5),
      Array.from({ length: n }, (_, i) => sessionOn(i, 1000 + i * 10, null))
    );

    const result = sleepTrainingCorrelations(join);

    expect(result.volumeLoad).not.toBeNull();
    expect(result.meanRpe).toBeNull();
  });

  it('withholds "trained" when every logged day trained', () => {
    // No variance in the outcome: 40 days, all of them training days. There is
    // nothing to distinguish, and a number here would be meaningless.
    const n = CORRELATION_MIN_PAIRS * 2;
    const join = joinSleepWithTraining(
      nightsFrom(n, (i) => 360 + i * 5),
      Array.from({ length: n }, (_, i) => sessionOn(i, 1000, 7))
    );

    expect(sleepTrainingCorrelations(join).trained).toBeNull();
  });
});
