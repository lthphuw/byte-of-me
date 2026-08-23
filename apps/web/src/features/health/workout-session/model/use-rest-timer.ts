'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  playRestCue,
  primeRestCue,
} from '@/features/health/workout-session/lib/rest-cue';

/**
 * How often the display is repainted. Not how the elapsed time is measured.
 *
 * 500ms rather than 1000: a clock ticking on its own schedule drifts up to a
 * full second away from the second it is displaying, so it visibly stutters —
 * two rounds per second keeps the printed number within half a second of the
 * truth without spending anything.
 */
const REPAINT_MS = 500;

export interface RestTimer {
  /** Epoch ms the rest began, or null when nothing is resting. */
  startedAt: number | null;
  targetSec: number;
  elapsedSec: number;
  /** Negative once the target has passed — the timer counts UP through zero
   *  rather than stopping, because "two minutes twenty over" is information a
   *  lifter uses and a frozen 0:00 is not. */
  remainingSec: number;
  isResting: boolean;
  isOver: boolean;
  start: (targetSec: number) => void;
  stop: () => void;
  /** Adds seconds to the target, leaving the start where it is. */
  extend: (deltaSec: number) => void;
}

/**
 * The rest interval, measured from a TIMESTAMP.
 *
 * This is the one design rule the timer has, and it is not a preference. A
 * counter incremented by `setInterval` measures how often the browser ran the
 * callback, which is not the same thing as time: a backgrounded tab is
 * throttled to roughly 1 Hz, a locked phone freezes timers outright, and both
 * are the normal state of a phone during rest — in a pocket, screen off. A
 * tick-counting timer comes back from three minutes in a pocket reading forty
 * seconds. This one stores `restStartedAt` and renders `now − restStartedAt`,
 * so whatever the browser did while it was away, the number on return is
 * right.
 *
 * The interval below therefore does not measure anything. It exists only to
 * repaint, and it is joined by `visibilitychange` — when the tab comes back
 * the clock is recomputed on the spot rather than at the end of whatever
 * throttled interval was pending, which is what stops the display showing a
 * stale figure for the first half-second after a wake.
 *
 * The completion CUE is a different matter and cannot be recovered the same
 * way: a frozen tab runs nothing, so the beep for a rest that ended while the
 * screen was off fires when the tab wakes. `hasFired` makes that once rather
 * than never or repeatedly, and it is why the wake lock (`use-wake-lock.ts`)
 * matters — with the screen awake the tab is not frozen and the cue is on
 * time.
 */
export function useRestTimer(): RestTimer {
  const [rest, setRest] = useState<{
    startedAt: number;
    targetSec: number;
  } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const hasFired = useRef(false);

  const start = useCallback((targetSec: number) => {
    // On the gesture that started the rest, which is the only moment iOS will
    // let audio be unlocked — the timer's own callback three minutes later is
    // not a user gesture and would be refused.
    primeRestCue();

    hasFired.current = false;
    setRest({ startedAt: Date.now(), targetSec });
    setNow(Date.now());
  }, []);

  const stop = useCallback(() => {
    hasFired.current = false;
    setRest(null);
  }, []);

  const extend = useCallback((deltaSec: number) => {
    setRest((current) => {
      if (!current) return current;

      const targetSec = Math.max(0, current.targetSec + deltaSec);
      // Extending past the current elapsed time puts the timer back in front
      // of the reader, so the cue has to be allowed to fire again.
      if (targetSec * 1000 > Date.now() - current.startedAt) {
        hasFired.current = false;
      }

      return { ...current, targetSec };
    });
  }, []);

  useEffect(() => {
    if (!rest) return;

    const repaint = () => setNow(Date.now());
    const interval = window.setInterval(repaint, REPAINT_MS);

    // The half that survives a throttled tab: whatever the interval did or did
    // not do while the phone was in a pocket, coming back recomputes at once.
    const onVisible = () => {
      if (document.visibilityState === 'visible') repaint();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', repaint);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', repaint);
    };
  }, [rest]);

  const elapsedSec = rest
    ? Math.max(0, Math.floor((now - rest.startedAt) / 1000))
    : 0;
  const targetSec = rest?.targetSec ?? 0;
  const isOver = rest !== null && elapsedSec >= targetSec;

  useEffect(() => {
    if (!isOver || hasFired.current) return;

    hasFired.current = true;
    playRestCue();
  }, [isOver]);

  return {
    startedAt: rest?.startedAt ?? null,
    targetSec,
    elapsedSec,
    remainingSec: targetSec - elapsedSec,
    isResting: rest !== null,
    isOver,
    start,
    stop,
    extend,
  };
}
