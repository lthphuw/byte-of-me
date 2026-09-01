/**
 * What this spec defends: "đêm qua" is dated by the day of WAKING, so the
 * entry card resolves it to today's key and to nothing else. The regression it
 * exists for is the fallback it replaced — the last row in the window — which
 * showed a night from days ago under the words "last night", and would have
 * opened the wrong day's sheet.
 */
import { describe, expect, it } from 'bun:test';

import { lastNightOf } from './last-night';

const today = '2026-09-01';

describe('lastNightOf', () => {
  it('reads the night dated the day of waking', () => {
    const nights = [{ localDate: '2026-08-31' }, { localDate: today }];

    expect(lastNightOf(nights, today)).toEqual({ localDate: today });
  });

  it('reports nothing when only earlier nights are on record', () => {
    const nights = [{ localDate: '2026-08-30' }, { localDate: '2026-08-31' }];

    expect(lastNightOf(nights, today)).toBeNull();
  });

  it('does not fall back to the most recent row', () => {
    const nights = [{ localDate: '2026-08-28' }];

    expect(lastNightOf(nights, today)).toBeNull();
  });

  it('reports nothing on an empty history', () => {
    expect(lastNightOf([], today)).toBeNull();
  });

  it('ignores row order and a night dated after today', () => {
    const nights = [
      { localDate: '2026-09-02', totalSleepMin: 1 },
      { localDate: today, totalSleepMin: 2 },
      { localDate: '2026-08-31', totalSleepMin: 3 },
    ];

    expect(lastNightOf(nights, today)?.totalSleepMin).toBe(2);
  });
});
