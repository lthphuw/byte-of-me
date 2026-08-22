/**
 * What this spec defends: efficiency is WITHHELD rather than reported as 100%
 * when nothing was measured, debt never goes negative, and a gap in the day
 * sequence ends a streak. These are the three ways a sleep tracker lies.
 */
import { describe, expect, it } from 'bun:test';

import {
  computeNight,
  currentStreak,
  minutesStdDev,
  sleepDebtMin,
  type SleepNight,
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
});

describe('sleepDebtMin', () => {
  const at = (day: string, total: number): SleepNight => ({
    localDate: new Date(`${day}T00:00:00.000Z`),
    timeInBedMin: total,
    totalSleepMin: total,
    efficiencyPct: null,
    estimated: true,
    midsleepMin: 0,
  });

  it('sums the shortfall against the target', () => {
    expect(
      sleepDebtMin([at('2026-08-21', 400), at('2026-08-22', 440)], 480)
    ).toBe(120);
  });

  it('lets a surplus night repay debt', () => {
    expect(
      sleepDebtMin([at('2026-08-21', 400), at('2026-08-22', 520)], 480)
    ).toBe(40);
  });

  it('never reports a negative debt — sleep cannot be banked in advance', () => {
    expect(
      sleepDebtMin([at('2026-08-21', 600), at('2026-08-22', 600)], 480)
    ).toBe(0);
  });

  it('ignores nights outside the window', () => {
    const old = at('2026-01-01', 0);
    expect(sleepDebtMin([old, at('2026-08-22', 480)], 480, 14)).toBe(0);
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
  const on = (day: string): SleepNight => ({
    localDate: new Date(`${day}T00:00:00.000Z`),
    timeInBedMin: 480,
    totalSleepMin: 480,
    efficiencyPct: null,
    estimated: true,
    midsleepMin: 0,
  });
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
