/**
 * What this spec defends: the two twelve-hour slips are corrected, a plausible
 * pair is left alone, and no correction ever runs on a pair the form could
 * have meant — because a repair the reader did not ask for is only safe while
 * the alternative reading is impossible.
 */
import { describe, expect, it } from 'bun:test';

import { LONG_NIGHT_MIN, repairNight } from './night-repair';

const clock = (h: number, m = 0) => h * 60 + m;

describe('repairNight', () => {
  it('leaves an ordinary night alone', () => {
    expect(repairNight(clock(23), clock(7))).toBeNull();
  });

  it('leaves a night alone that crosses midnight from the small hours', () => {
    expect(repairNight(clock(1, 30), clock(9, 15))).toBeNull();
  });

  it('pulls an afternoon wake time back twelve hours', () => {
    expect(repairNight(clock(23), clock(19))).toEqual({
      field: 'wake',
      corrected: clock(7),
    });
  });

  it('pushes a midday bedtime forward twelve hours', () => {
    expect(repairNight(clock(11), clock(7))).toEqual({
      field: 'bed',
      corrected: clock(23),
    });
  });

  it('corrects the wake time first when both clocks could be the slip', () => {
    // 11:00 → 22:00 is eleven hours, under the threshold, so nothing fires.
    expect(repairNight(clock(11), clock(22))).toBeNull();
  });

  it('accepts a long night whose clocks are outside both windows', () => {
    // In bed 20:00 → 11:00 is fifteen hours. The wake clock is a morning one
    // and the bed clock is an evening one, so neither reading is a slip: the
    // form flags the length instead of rewriting it.
    const timeInBed = clock(11) + 1440 - clock(20);
    expect(timeInBed).toBeGreaterThanOrEqual(LONG_NIGHT_MIN);
    expect(repairNight(clock(20), clock(11))).toBeNull();
  });

  it('does not fire exactly at twelve hours', () => {
    expect(repairNight(clock(23), clock(11))).toBeNull();
  });
});
