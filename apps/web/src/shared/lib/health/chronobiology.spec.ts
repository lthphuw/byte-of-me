/**
 * What this spec defends: the three chronobiology measures refuse to answer
 * on data that cannot support them, and SRI is computed on a clock-minute
 * grid rather than on durations — a sleeper who logs the same 7h30 every
 * night but starts it at a different hour is NOT regular, and only a
 * minute-grid comparison notices.
 */
import { describe, expect, it } from 'bun:test';

import {
  type MidpointNight,
  midpointStats,
  msfsc,
  type SleepInterval,
  sleepRegularityIndex,
  socialJetlagMin,
} from './chronobiology';

const DAY_MS = 86_400_000;
const day = (n: number) => new Date(n * DAY_MS);

/** A night ending on day `n`: asleep from 23:00 the evening before to 07:00. */
const night = (n: number, shiftMin = 0): SleepInterval => ({
  localDate: day(n),
  onsetOffsetMin: -60 + shiftMin, // 23:00 previous evening
  wakeOffsetMin: 420 + shiftMin, // 07:00
});

describe('sleepRegularityIndex', () => {
  it('returns 100 for a sleeper who is identical every night', () => {
    expect(
      sleepRegularityIndex([
        night(20000),
        night(20001),
        night(20002),
        night(20003),
      ])
    ).toBeCloseTo(100, 6);
  });

  it('drops by exactly the minutes that disagree when one night shifts', () => {
    // Nights 1,2,4 unshifted; night 3 an hour later at both ends.
    // Pair(d1,d2): 60 evening minutes differ  -> 1380 match
    // Pair(d2,d3): 60 morning + 60 evening    -> 1320 match
    // SRI = -100 + 200 * (1380+1320) / (1440*2) = 87.5
    expect(
      sleepRegularityIndex([
        night(20000),
        night(20001),
        night(20002, 60),
        night(20003),
      ])
    ).toBeCloseTo(87.5, 6);
  });

  it('is blind to duration alone — same length, different clock time is irregular', () => {
    const regular = sleepRegularityIndex([
      night(20000),
      night(20001),
      night(20002),
      night(20003),
    ]);
    const shifted = sleepRegularityIndex([
      night(20000),
      night(20001, 180),
      night(20002),
      night(20003, 180),
    ]);
    expect(regular).toBeGreaterThan(shifted as number);
  });

  it('returns null when no calendar day is fully determined', () => {
    // A day needs BOTH the sleep that ended on it and the one that started on
    // it, so two nights yield one observed day and zero comparable pairs.
    expect(sleepRegularityIndex([night(20000), night(20001)])).toBeNull();
  });

  it('returns null across a gap that leaves no consecutive observed pair', () => {
    expect(
      sleepRegularityIndex([
        night(20000),
        night(20001),
        night(20010),
        night(20011),
      ])
    ).toBeNull();
  });
});

const mid = (
  midsleepMin: number,
  isFreeDay: boolean,
  totalSleepMin = 450
): MidpointNight => ({
  midsleepMin,
  isFreeDay,
  totalSleepMin,
});

describe('socialJetlagMin', () => {
  it('is the gap between mean free-day and mean work-day midsleep', () => {
    const nights = [
      mid(210, false),
      mid(210, false),
      mid(210, false),
      mid(330, true),
      mid(330, true),
      mid(330, true),
    ];
    expect(socialJetlagMin(nights)).toBe(120);
  });

  it('is unsigned — sleeping EARLIER at the weekend still counts', () => {
    const nights = [
      mid(330, false),
      mid(330, false),
      mid(330, false),
      mid(210, true),
      mid(210, true),
      mid(210, true),
    ];
    expect(socialJetlagMin(nights)).toBe(120);
  });

  it('refuses to answer below three days of either kind', () => {
    const nights = [
      mid(210, false),
      mid(210, false),
      mid(210, false),
      mid(330, true),
      mid(330, true),
    ];
    expect(socialJetlagMin(nights)).toBeNull();
  });
});

describe('msfsc', () => {
  it('corrects the free-day midpoint for sleep caught up at the weekend', () => {
    // 4 work nights of 400 min, 3 free nights of 540 min, MSF 330.
    // SD_week = (400*4 + 540*3) / 7 = 460
    // MSFsc   = 330 - (540 - 460)/2 = 290
    const nights = [
      ...Array.from({ length: 4 }, () => mid(210, false, 400)),
      ...Array.from({ length: 3 }, () => mid(330, true, 540)),
    ];
    expect(msfsc(nights)).toBeCloseTo(290, 6);
  });

  it('weights by the actual sample, not a hardcoded 7 days', () => {
    // The same ratio over 14 days must give the same answer. Dividing by a
    // literal 7 here would double SD_week and drive the result negative.
    const nights = [
      ...Array.from({ length: 8 }, () => mid(210, false, 400)),
      ...Array.from({ length: 6 }, () => mid(330, true, 540)),
    ];
    expect(msfsc(nights)).toBeCloseTo(290, 6);
  });

  it('leaves the midpoint alone when free days are not longer', () => {
    const nights = [
      ...Array.from({ length: 4 }, () => mid(210, false, 500)),
      ...Array.from({ length: 3 }, () => mid(330, true, 450)),
    ];
    expect(msfsc(nights)).toBeCloseTo(330, 6);
  });

  it('refuses to answer without both kinds of day', () => {
    expect(
      msfsc([mid(210, false), mid(210, false), mid(210, false)])
    ).toBeNull();
  });

  it('refuses a chronotype built on fewer than three free days', () => {
    // MSF is a MEAN across free days. Two of them is not a mean, and the
    // screen labels this figure a trait.
    const nights = [
      ...Array.from({ length: 5 }, () => mid(210, false, 400)),
      ...Array.from({ length: 2 }, () => mid(330, true, 540)),
    ];
    expect(msfsc(nights)).toBeNull();
  });
});

describe('midpointStats', () => {
  it('reports the counts a caller needs to decide whether to render', () => {
    const stats = midpointStats([
      mid(210, false),
      mid(330, true),
      mid(340, true),
    ]);
    expect(stats.workCount).toBe(1);
    expect(stats.freeCount).toBe(2);
    expect(stats.msf).toBeCloseTo(335, 6);
    expect(stats.msw).toBeCloseTo(210, 6);
  });
});
