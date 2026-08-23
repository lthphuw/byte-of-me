'use client';

import { useEffect, useState } from 'react';

/**
 * The current time, repainted on an interval.
 *
 * The interval does not MEASURE anything — every duration on this screen is
 * `now − storedTimestamp`, computed at render. That distinction is the whole
 * reason this hook exists rather than a counter: a backgrounded tab is
 * throttled to roughly 1 Hz and a locked phone freezes timers outright, so a
 * counter incremented per tick comes back from a set reading minutes short,
 * while a subtraction from a timestamp is right the instant it is evaluated.
 *
 * `visibilitychange` recomputes on return rather than waiting for whatever
 * throttled interval was pending, which is what stops the header showing a
 * stale figure for the first half-minute after a phone comes out of a pocket.
 *
 * The default cadence is coarse on purpose: a session clock is read in
 * minutes, and repainting a whole screen every second to move a digit once a
 * minute is sixty pointless renders. Callers that print seconds pass their own.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
    };
  }, [intervalMs]);

  return now;
}
