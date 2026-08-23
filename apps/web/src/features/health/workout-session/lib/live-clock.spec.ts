import { describe, expect, it } from 'bun:test';

import { elapsedMinutes, elapsedSeconds, formatSeconds } from './live-clock';

describe('formatSeconds', () => {
  it('pads the seconds and not the minutes, the way a stopwatch reads', () => {
    expect(formatSeconds(65)).toBe('1:05');
    expect(formatSeconds(9)).toBe('0:09');
  });

  it('pads the minutes once an hour is on the clock', () => {
    // Unpadded, `1:5:03` reads as five minutes past one.
    expect(formatSeconds(3903)).toBe('1:05:03');
  });

  it('floors a negative interval at zero rather than printing a minus', () => {
    expect(formatSeconds(-30)).toBe('0:00');
  });
});

describe('elapsedMinutes', () => {
  const start = '2026-08-23T09:00:00.000Z';

  it('measures from the stored timestamp, not from a tick count', () => {
    expect(elapsedMinutes(start, Date.parse('2026-08-23T10:23:40.000Z'))).toBe(
      83
    );
  });

  it('answers zero for a clock that reads earlier than the start', () => {
    // Two devices' clocks disagree by more than the session is old. A negative
    // duration would feed a negative training load into every later figure.
    expect(elapsedMinutes(start, Date.parse('2026-08-23T08:00:00.000Z'))).toBe(
      0
    );
  });

  it('answers zero for a timestamp it cannot read', () => {
    expect(elapsedMinutes('not a date', Date.now())).toBe(0);
  });
});

describe('elapsedSeconds', () => {
  it('floors to whole seconds', () => {
    expect(
      elapsedSeconds(
        '2026-08-23T09:00:00.000Z',
        Date.parse('2026-08-23T09:00:59.900Z')
      )
    ).toBe(59);
  });
});
