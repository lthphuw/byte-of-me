/**
 * What this spec defends: a contrast is refused until five nights sit on each
 * side, a night pairs with the day it WOKE INTO and not the day after, a
 * bucket edge lands in exactly one bucket, a recent bad night outweighs an old
 * one, a nap never repays debt, and an empty history returns a usable object.
 */
import { describe, expect, it } from 'bun:test';

import {
  DEBT_DECAY,
  DEBT_WINDOW_NIGHTS,
  durationBucketId,
  type InsightNight,
  MIN_NIGHTS_PER_SIDE,
  moodByDuration,
  pairNightsWithMood,
  rankedContrasts,
  sleepDebt,
  sleepNeedMin,
  weeklyReview,
} from './sleep-insights';

const FACTORS = ['caffeine_late', 'alcohol', 'ill'] as const;

function night(over: Partial<InsightNight> = {}): InsightNight {
  return {
    localDate: '2026-08-22',
    totalSleepMin: 420,
    efficiencyPct: 88,
    midsleepMin: 200,
    isFreeDay: false,
    napBucket: null,
    factors: [],
    quality: null,
    restedness: null,
    mood: null,
    ...over,
  };
}

/** `count` nights ending on 2026-08-30, one per day going back. */
function run(count: number, over: (i: number) => Partial<InsightNight>) {
  return Array.from({ length: count }, (_, i) => {
    const day = new Date('2026-08-30T00:00:00.000Z');
    day.setUTCDate(day.getUTCDate() - i);

    return night({ localDate: day.toISOString().slice(0, 10), ...over(i) });
  });
}

describe('rankedContrasts — the n-gate', () => {
  it('refuses at four-and-five and reports how many nights are missing', () => {
    const nights = [
      ...run(4, () => ({ factors: ['alcohol'], restedness: 2 })),
      ...run(5, (i) => ({
        localDate: `2026-08-1${i}`,
        factors: [],
        restedness: 4,
      })),
    ];

    const { contrasts, progress } = rankedContrasts(nights, FACTORS);

    expect(contrasts).toEqual([]);
    expect(progress).toEqual([
      {
        factor: 'alcohol',
        outcome: 'restedness',
        withN: 4,
        withoutN: 5,
        nightsNeeded: 1,
      },
    ]);
  });

  it('shows the contrast at five-and-five, with both n visible', () => {
    const nights = [
      ...run(5, () => ({ factors: ['alcohol'], restedness: 2 })),
      ...run(5, (i) => ({
        localDate: `2026-08-1${i}`,
        factors: [],
        restedness: 4,
      })),
    ];

    const { contrasts, progress } = rankedContrasts(nights, FACTORS);

    expect(progress).toEqual([]);
    expect(contrasts).toEqual([
      {
        factor: 'alcohol',
        outcome: 'restedness',
        withN: 5,
        withMean: 2,
        withoutN: 5,
        withoutMean: 4,
        delta: -2,
      },
    ]);
  });

  it('gates on the OUTCOME being present, not on the night existing', () => {
    // Ten nights with alcohol, but only four of them were ever rated.
    const nights = [
      ...run(4, () => ({ factors: ['alcohol'], restedness: 2 })),
      ...run(6, (i) => ({
        localDate: `2026-07-0${i + 1}`,
        factors: ['alcohol'],
        restedness: null,
      })),
      ...run(5, (i) => ({
        localDate: `2026-08-1${i}`,
        factors: [],
        restedness: 4,
      })),
    ];

    expect(rankedContrasts(nights, FACTORS).contrasts).toEqual([]);
  });

  it('offers no progress line for a factor the owner has never ticked', () => {
    const nights = run(10, (i) => ({
      localDate: `2026-08-1${i === 9 ? 0 : i}`,
      restedness: 3,
    }));

    expect(rankedContrasts(nights, FACTORS).progress).toEqual([]);
  });

  it('falls back to the next outcome when the first cannot be gated', () => {
    const nights = [
      ...run(5, () => ({ factors: ['ill'], restedness: null, mood: 2 })),
      ...run(5, (i) => ({ localDate: `2026-08-1${i}`, mood: 5 })),
    ];

    const { contrasts } = rankedContrasts(nights, FACTORS);

    expect(contrasts).toHaveLength(1);
    expect(contrasts[0].outcome).toBe('mood');
  });

  it('caps at three, ranked by absolute effect', () => {
    // Four factors on four blocks of five nights, rated 1 / 2 / 3 / 5. A night
    // WITHOUT one factor may still carry another, which is what a real diary
    // looks like: the effects are −2.33 / −1 / +0.33 / +3, so c is dropped.
    const factors = ['a', 'b', 'c', 'd'];
    const rating: Record<string, number> = { a: 1, b: 2, c: 3, d: 5 };

    const nights = factors.flatMap((f, k) =>
      Array.from({ length: 5 }, (_, i) =>
        night({
          localDate: `2026-0${k + 1}-0${i + 1}`,
          factors: [f],
          restedness: rating[f],
        })
      )
    );

    const { contrasts } = rankedContrasts(nights, factors);

    expect(contrasts.map((c) => c.factor)).toEqual(['d', 'a', 'b']);
    expect(contrasts.map((c) => Math.round(c.delta * 100) / 100)).toEqual([
      3, -2.33, -1,
    ]);
  });

  it('is a 5-and-5 gate — the constant is not a coincidence', () => {
    expect(MIN_NIGHTS_PER_SIDE).toBe(5);
  });
});

describe('pairNightsWithMood — direction and lag', () => {
  const nights = [
    { ...night({ localDate: '2026-08-10', totalSleepMin: 300 }), mood: undefined },
  ].map(({ mood: _mood, ...rest }) => rest);

  const moods = new Map([
    ['2026-08-10', 5],
    ['2026-08-11', 1],
  ]);

  it('pairs a night with the day it woke into, not the day after', () => {
    // `localDate` is the day of WAKING, so night D carries day D's mood. The
    // off-by-one that swaps these makes every figure on the panel wrong.
    expect(pairNightsWithMood(nights, moods)[0].mood).toBe(5);
  });

  it('carries that pairing into the buckets', () => {
    const paired = pairNightsWithMood(nights, moods);
    const short = moodByDuration(paired).find((b) => b.id === 'lt6');

    expect(short).toEqual({ id: 'lt6', n: 1, meanMood: 5 });
  });

  it('leaves a night with no journal entry unpaired rather than at zero', () => {
    expect(pairNightsWithMood(nights, new Map())[0].mood).toBeNull();
  });
});

describe('moodByDuration — bucket edges', () => {
  it('puts exactly six hours and exactly seven and a half in the middle', () => {
    expect(durationBucketId(359)).toBe('lt6');
    expect(durationBucketId(360)).toBe('mid');
    expect(durationBucketId(450)).toBe('mid');
    expect(durationBucketId(451)).toBe('gt7h30');
  });

  it('always returns all three buckets, empty ones included', () => {
    const buckets = moodByDuration([night({ totalSleepMin: 400, mood: 4 })]);

    expect(buckets.map((b) => b.id)).toEqual(['lt6', 'mid', 'gt7h30']);
    expect(buckets.map((b) => b.n)).toEqual([0, 1, 0]);
    expect(buckets.map((b) => b.meanMood)).toEqual([null, 4, null]);
  });

  it('counts only nights that carry a mood', () => {
    const buckets = moodByDuration([
      night({ totalSleepMin: 300, mood: 2 }),
      night({ totalSleepMin: 300, mood: null }),
    ]);

    expect(buckets[0]).toEqual({ id: 'lt6', n: 1, meanMood: 2 });
  });
});

describe('sleepNeedMin', () => {
  it('defaults to the configured target below five free days', () => {
    const nights = run(4, () => ({ isFreeDay: true, totalSleepMin: 600 }));

    expect(sleepNeedMin(nights, 450)).toEqual({
      needMin: 450,
      needSource: 'target',
      freeDayP90Min: null,
      freeDayCount: 4,
    });
  });

  it('uses the free-day P90 once five free days exist', () => {
    const nights = run(5, (i) => ({
      isFreeDay: true,
      totalSleepMin: [480, 500, 520, 540, 560][i],
    }));

    expect(sleepNeedMin(nights, 450)).toEqual({
      needMin: 560,
      needSource: 'freeDayP90',
      freeDayP90Min: 560,
      freeDayCount: 5,
    });
  });

  it('never drops below the target, and says which one it used', () => {
    const nights = run(5, () => ({ isFreeDay: true, totalSleepMin: 300 }));

    expect(sleepNeedMin(nights, 480)).toEqual({
      needMin: 480,
      needSource: 'target',
      freeDayP90Min: 300,
      freeDayCount: 5,
    });
  });
});

describe('sleepDebt', () => {
  const END = '2026-08-30';

  it('matches a flat sum when every night is short by the same amount', () => {
    const nights = run(DEBT_WINDOW_NIGHTS, () => ({ totalSleepMin: 400 }));

    expect(sleepDebt(nights, END, 480).debtMin).toBe(14 * 80);
  });

  it('gives the most recent night about 15% of the weight', () => {
    const weights = Array.from(
      { length: DEBT_WINDOW_NIGHTS },
      (_, i) => DEBT_DECAY ** i
    );
    const share = weights[0] / weights.reduce((a, b) => a + b, 0);

    expect(share).toBeCloseTo(0.15, 3);
  });

  it('weighs last night more heavily than a fortnight-old one', () => {
    const recentlyBad = run(DEBT_WINDOW_NIGHTS, (i) => ({
      totalSleepMin: i === 0 ? 300 : 480,
    }));
    const longAgoBad = run(DEBT_WINDOW_NIGHTS, (i) => ({
      totalSleepMin: i === 13 ? 300 : 480,
    }));

    expect(sleepDebt(recentlyBad, END, 480).debtMin).toBeGreaterThan(
      sleepDebt(longAgoBad, END, 480).debtMin
    );
  });

  it('weights by how long ago a night was, not by its rank among those logged', () => {
    const withGap = [
      night({ localDate: '2026-08-30', totalSleepMin: 480 }),
      night({ localDate: '2026-08-20', totalSleepMin: 300 }),
    ];
    const adjacent = [
      night({ localDate: '2026-08-30', totalSleepMin: 480 }),
      night({ localDate: '2026-08-29', totalSleepMin: 300 }),
    ];

    expect(sleepDebt(withGap, END, 480).debtMin).toBeLessThan(
      sleepDebt(adjacent, END, 480).debtMin
    );
  });

  it('scales by the nights actually seen rather than extrapolating the window', () => {
    const three = run(3, () => ({ totalSleepMin: 380 }));

    expect(sleepDebt(three, END, 480)).toMatchObject({
      debtMin: 300,
      nightsCounted: 3,
    });
  });

  it('lets a surplus repay, and never reports a negative debt', () => {
    const nights = run(DEBT_WINDOW_NIGHTS, () => ({ totalSleepMin: 600 }));

    expect(sleepDebt(nights, END, 480).debtMin).toBe(0);
  });

  it('ignores nights outside the fortnight', () => {
    const nights = [night({ localDate: '2026-01-01', totalSleepMin: 0 })];

    expect(sleepDebt(nights, END, 480)).toMatchObject({
      debtMin: 0,
      nightsCounted: 0,
    });
  });

  it('does not let a long nap repay the night, and counts the nights it fell on', () => {
    const plain = run(DEBT_WINDOW_NIGHTS, () => ({ totalSleepMin: 400 }));
    const napped = run(DEBT_WINDOW_NIGHTS, () => ({
      totalSleepMin: 400,
      napBucket: 'gt60',
    }));

    expect(sleepDebt(napped, END, 480).debtMin).toBe(
      sleepDebt(plain, END, 480).debtMin
    );
    expect(sleepDebt(napped, END, 480).longNapNights).toBe(DEBT_WINDOW_NIGHTS);
  });

  it('returns a usable object on an empty history', () => {
    expect(sleepDebt([], END, 480)).toEqual({
      debtMin: 0,
      needMin: 480,
      needSource: 'target',
      freeDayP90Min: null,
      freeDayCount: 0,
      nightsCounted: 0,
      longNapNights: 0,
    });
  });
});

describe('weeklyReview', () => {
  const END = '2026-08-30';

  it('splits the last seven nights from the seven before them', () => {
    const nights = run(14, (i) => ({ totalSleepMin: i < 7 ? 480 : 360 }));
    const review = weeklyReview(nights, END);

    expect(review.recent).toMatchObject({ nights: 7, meanDurationMin: 480 });
    expect(review.previous).toMatchObject({ nights: 7, meanDurationMin: 360 });
  });

  it('states exactly one observation, the largest move relative to its unit', () => {
    const nights = run(14, (i) => ({
      totalSleepMin: i < 7 ? 480 : 360,
      efficiencyPct: i < 7 ? 88 : 87,
    }));

    expect(weeklyReview(nights, END).observation).toEqual({
      kind: 'duration',
      delta: 120,
    });
  });

  it('states nothing rather than a move too small to matter', () => {
    const nights = run(14, (i) => ({
      totalSleepMin: i < 7 ? 480 : 470,
      efficiencyPct: 88,
    }));

    expect(weeklyReview(nights, END).observation).toBeNull();
  });

  it('ranks the week by restedness when it was rated, by duration otherwise', () => {
    const rated = run(7, (i) => ({ restedness: i === 0 ? 5 : 1, totalSleepMin: 300 }));
    const unrated = run(7, (i) => ({ totalSleepMin: i === 0 ? 600 : 300 }));

    expect(weeklyReview(rated, END)).toMatchObject({
      rankedBy: 'restedness',
      best: { localDate: '2026-08-30', value: 5 },
    });
    expect(weeklyReview(unrated, END)).toMatchObject({
      rankedBy: 'duration',
      best: { localDate: '2026-08-30', value: 600 },
    });
  });

  it('returns a usable object on an empty history', () => {
    const review = weeklyReview([], END);

    expect(review.recent.nights).toBe(0);
    expect(review.recent.meanDurationMin).toBeNull();
    expect(review.best).toBeNull();
    expect(review.worst).toBeNull();
    expect(review.observation).toBeNull();
  });

  it('withholds best and worst rather than naming one night both', () => {
    expect(weeklyReview([night({ localDate: END })], END)).toMatchObject({
      best: { localDate: END },
      worst: null,
    });
  });
});
