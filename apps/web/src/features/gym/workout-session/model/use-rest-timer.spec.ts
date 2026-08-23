import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, setSystemTime } from 'bun:test';

import { useRestTimer } from './use-rest-timer';

const START = new Date('2026-08-23T09:00:00.000Z');

/**
 * Moves the wall clock and lets the timer notice, WITHOUT letting any interval
 * run in between.
 *
 * That is the whole point of these tests: a phone in a pocket freezes its
 * timers, so the only honest way to prove the elapsed time is derived from a
 * stored timestamp — rather than counted in callbacks — is to advance the clock
 * while nothing ticks and then wake the tab up.
 */
function jumpTo(seconds: number) {
  setSystemTime(new Date(START.getTime() + seconds * 1000));
  act(() => {
    window.dispatchEvent(new Event('focus'));
  });
}

afterEach(() => {
  setSystemTime();
});

describe('useRestTimer', () => {
  it('reports the time that really passed, not the callbacks that ran', () => {
    setSystemTime(START);
    const { result } = renderHook(() => useRestTimer());

    act(() => result.current.start(120));
    jumpTo(200);

    expect(result.current.elapsedSec).toBe(200);
    expect(result.current.remainingSec).toBe(-80);
    expect(result.current.isOver).toBe(true);
  });

  it('counts down while the rest is still running', () => {
    setSystemTime(START);
    const { result } = renderHook(() => useRestTimer());

    act(() => result.current.start(120));
    jumpTo(30);

    expect(result.current.remainingSec).toBe(90);
    expect(result.current.isOver).toBe(false);
    expect(result.current.isResting).toBe(true);
  });

  it('puts the timer back in front of the reader when the rest is extended', () => {
    setSystemTime(START);
    const { result } = renderHook(() => useRestTimer());

    act(() => result.current.start(120));
    jumpTo(130);
    expect(result.current.isOver).toBe(true);

    act(() => result.current.extend(60));

    expect(result.current.targetSec).toBe(180);
    expect(result.current.remainingSec).toBe(50);
    expect(result.current.isOver).toBe(false);
  });

  it('keeps the start where it was when the rest is extended', () => {
    // Extending adds to the TARGET, never to the start: pushing the start
    // forward would erase the rest already taken and restart the interval.
    setSystemTime(START);
    const { result } = renderHook(() => useRestTimer());

    act(() => result.current.start(120));
    jumpTo(90);
    act(() => result.current.extend(30));

    expect(result.current.elapsedSec).toBe(90);
  });

  it('stops resting entirely when skipped', () => {
    setSystemTime(START);
    const { result } = renderHook(() => useRestTimer());

    act(() => result.current.start(120));
    act(() => result.current.stop());

    expect(result.current.isResting).toBe(false);
    expect(result.current.startedAt).toBeNull();
    expect(result.current.isOver).toBe(false);
  });

  it('restarts from now, so the second set does not inherit the first rest', () => {
    setSystemTime(START);
    const { result } = renderHook(() => useRestTimer());

    act(() => result.current.start(120));
    jumpTo(200);

    setSystemTime(new Date(START.getTime() + 200_000));
    act(() => result.current.start(120));

    expect(result.current.elapsedSec).toBe(0);
    expect(result.current.isOver).toBe(false);
  });
});
