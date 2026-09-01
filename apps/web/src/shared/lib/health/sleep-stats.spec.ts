/**
 * What this spec defends: efficiency is WITHHELD rather than reported as 100%
 * when nothing was measured, it is measured against time in BED rather than
 * the sleep window, an evening clock value is unwrapped onto the same scale as
 * an after-midnight one, and a gap in the day sequence ends a streak. These
 * are the ways a sleep tracker lies.
 */
import { describe, expect, it } from 'bun:test';

import {
  awakeMinutesBand,
  awakeningsCountBand,
  computeNight,
  currentStreak,
  efficiencyBand,
  latencyBand,
  minutesStdDev,
  type SleepNight,
  unwrapNearMidnight,
} from './sleep-stats';

const night = (over: Partial<Parameters<typeof computeNight>[0]> = {}) =>
  computeNight({
    localDate: new Date('2026-08-22T00:00:00.000Z'),
    bedAt: new Date('2026-08-21T23:40:00.000Z'),
    wakeAt: new Date('2026-08-22T07:10:00.000Z'),
    latencyMin: null,
    awakeningsMin: null,
    ...over,
  });

describe('computeNight', () => {
  it('computes time in bed across midnight', () => {
    expect(night().timeInBedMin).toBe(450); // 7h30
  });

  it('withholds efficiency when nothing was measured, and flags the estimate', () => {
    const n = night();
    expect(n.efficiencyPct).toBeNull();
    expect(n.estimated).toBe(true);
    expect(n.totalSleepMin).toBe(450);
  });

  it('subtracts latency and awakenings, and then reports efficiency', () => {
    const n = night({ latencyMin: 20, awakeningsMin: 10 });
    expect(n.totalSleepMin).toBe(420);
    expect(n.estimated).toBe(false);
    expect(n.efficiencyPct).toBeCloseTo((420 / 450) * 100, 5);
  });

  it('reports efficiency when only one of the two was measured', () => {
    expect(night({ latencyMin: 20 }).efficiencyPct).toBeCloseTo(
      (430 / 450) * 100,
      5
    );
  });

  it('never returns a negative sleep time', () => {
    expect(night({ latencyMin: 600, awakeningsMin: 600 }).totalSleepMin).toBe(
      0
    );
  });

  it('places midsleep as minutes past local midnight of the wake day', () => {
    // onset 23:40 on the 21st, 450 min of sleep -> midpoint 03:25 on the 22nd.
    expect(night().midsleepMin).toBe(3 * 60 + 25);
  });

  it('falls back to wake - bed for time in bed when riseAt is null', () => {
    const n = night();
    expect(n.timeInBedMin).toBe(450);
    expect(n.sleepWindowMin).toBe(450);
    expect(n.riseEstimated).toBe(true);
  });

  it('ends time in bed at riseAt, so the lie-in counts against efficiency', () => {
    // 30 minutes lying awake after waking: TIB 480, TST unchanged at 420.
    const n = night({
      riseAt: new Date('2026-08-22T07:40:00.000Z'),
      latencyMin: 20,
      awakeningsMin: 10,
    });

    expect(n.timeInBedMin).toBe(480);
    expect(n.sleepWindowMin).toBe(450);
    expect(n.totalSleepMin).toBe(420);
    expect(n.efficiencyPct).toBeCloseTo((420 / 480) * 100, 5);
    expect(n.riseEstimated).toBe(false);
  });

  it('scores the same night higher when it ends at waking', () => {
    const withLieIn = night({
      riseAt: new Date('2026-08-22T07:40:00.000Z'),
      latencyMin: 20,
      awakeningsMin: 10,
    });
    const straightUp = night({
      riseAt: new Date('2026-08-22T07:10:00.000Z'),
      latencyMin: 20,
      awakeningsMin: 10,
    });

    expect(straightUp.efficiencyPct).toBeGreaterThan(
      withLieIn.efficiencyPct as number
    );
    expect(straightUp.timeInBedMin).toBe(450);
  });

  it('never lets time in bed fall below the sleep window', () => {
    // A rise instant before waking cannot shorten the night into a >100%
    // efficiency; the schema rejects it, and the maths refuses it too.
    const n = night({
      riseAt: new Date('2026-08-22T06:00:00.000Z'),
      latencyMin: 20,
    });

    expect(n.timeInBedMin).toBe(450);
    expect(n.efficiencyPct as number).toBeLessThanOrEqual(100);
  });

  it('carries the nap bucket without letting it touch a single figure', () => {
    const withNap = night({ napBucket: 'gt60', latencyMin: 20 });
    const withoutNap = night({ latencyMin: 20 });

    expect(withNap.napBucket).toBe('gt60');
    expect(withNap.totalSleepMin).toBe(withoutNap.totalSleepMin);
    expect(withNap.timeInBedMin).toBe(withoutNap.timeInBedMin);
    expect(withNap.efficiencyPct).toBe(withoutNap.efficiencyPct);
  });

  it('carries the awakenings count beside the minutes', () => {
    expect(night({ awakeningsCount: 3 }).awakeningsCount).toBe(3);
    expect(night().awakeningsCount).toBeNull();
  });
});

/**
 * The NSF consensus bands (Ohayon et al., Sleep Health 3(1), 2017). The
 * boundaries themselves are the contract — a UI reading "good" at 84%
 * efficiency would be reporting a poor night as a fine one.
 */
describe('NSF threshold bands', () => {
  it('bands efficiency: >85% good, <75% poor', () => {
    expect(efficiencyBand(90)).toBe('good');
    expect(efficiencyBand(85)).toBe('good');
    expect(efficiencyBand(80)).toBe('fair');
    expect(efficiencyBand(75)).toBe('fair');
    expect(efficiencyBand(74)).toBe('poor');
  });

  it('bands latency: <30m good, >46m poor', () => {
    expect(latencyBand(10)).toBe('good');
    expect(latencyBand(30)).toBe('good');
    expect(latencyBand(40)).toBe('fair');
    expect(latencyBand(46)).toBe('fair');
    expect(latencyBand(47)).toBe('poor');
  });

  it('bands minutes awake: <20m good, >40m poor', () => {
    expect(awakeMinutesBand(0)).toBe('good');
    expect(awakeMinutesBand(20)).toBe('good');
    expect(awakeMinutesBand(30)).toBe('fair');
    expect(awakeMinutesBand(41)).toBe('poor');
  });

  it('bands awakenings: 0-1 good, >4 poor', () => {
    expect(awakeningsCountBand(0)).toBe('good');
    expect(awakeningsCountBand(1)).toBe('good');
    expect(awakeningsCountBand(3)).toBe('fair');
    expect(awakeningsCountBand(4)).toBe('fair');
    expect(awakeningsCountBand(5)).toBe('poor');
  });

  it('withholds a band rather than guessing one from a missing figure', () => {
    expect(efficiencyBand(null)).toBeNull();
    expect(latencyBand(null)).toBeNull();
    expect(awakeMinutesBand(null)).toBeNull();
    expect(awakeningsCountBand(null)).toBeNull();
  });
});

/** A night with only the fields the aggregate under test reads. */
const plainNight = (day: string, total: number): SleepNight => ({
  localDate: new Date(`${day}T00:00:00.000Z`),
  timeInBedMin: total,
  sleepWindowMin: total,
  totalSleepMin: total,
  efficiencyPct: null,
  estimated: true,
  riseEstimated: true,
  midsleepMin: 0,
  awakeningsCount: null,
  napBucket: null,
});

describe('unwrapNearMidnight', () => {
  it('puts an evening clock value on the same scale as an after-midnight one', () => {
    // 23:40 and 00:20 are forty minutes apart, not 1400.
    expect(unwrapNearMidnight(1420)).toBe(-20);
    expect(unwrapNearMidnight(20)).toBe(20);
  });

  it('leaves a morning value alone', () => {
    expect(unwrapNearMidnight(430)).toBe(430);
    expect(unwrapNearMidnight(719)).toBe(719);
  });
});

describe('minutesStdDev', () => {
  it('returns null below two samples — a deviation of one value is not a thing', () => {
    expect(minutesStdDev([])).toBeNull();
    expect(minutesStdDev([120])).toBeNull();
  });

  it('computes the population standard deviation', () => {
    expect(minutesStdDev([1380, 1440, 1500])).toBeCloseTo(48.9898, 3);
  });
});

describe('currentStreak', () => {
  const on = (day: string) => plainNight(day, 480);
  const today = new Date('2026-08-22T00:00:00.000Z');

  it('counts back from today', () => {
    expect(
      currentStreak(
        [on('2026-08-20'), on('2026-08-21'), on('2026-08-22')],
        today
      )
    ).toBe(3);
  });

  it('still counts when today is not logged yet but yesterday was', () => {
    expect(currentStreak([on('2026-08-20'), on('2026-08-21')], today)).toBe(2);
  });

  it('stops at a gap', () => {
    expect(
      currentStreak(
        [on('2026-08-18'), on('2026-08-21'), on('2026-08-22')],
        today
      )
    ).toBe(2);
  });

  it('is zero when the most recent log is older than yesterday', () => {
    expect(currentStreak([on('2026-08-19')], today)).toBe(0);
  });
});
