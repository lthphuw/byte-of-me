import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';

import { useEmblaState } from './use-embla-state';

type Listener = () => void;

/** The part of Embla's api the hook reads, with the events fired by hand. */
function fakeApi(start = { index: 0, prev: false, next: true }) {
  const state = { ...start };
  const listeners = new Map<string, Set<Listener>>();
  const api = {
    selectedScrollSnap: () => state.index,
    canScrollPrev: () => state.prev,
    canScrollNext: () => state.next,
    on(event: string, fn: Listener) {
      listeners.set(event, (listeners.get(event) ?? new Set()).add(fn));
      return api;
    },
    off(event: string, fn: Listener) {
      listeners.get(event)?.delete(fn);
      return api;
    },
  };
  return {
    api: api as unknown as Parameters<typeof useEmblaState>[0],
    move(
      to: { index: number; prev: boolean; next: boolean },
      event = 'select'
    ) {
      Object.assign(state, to);
      act(() => listeners.get(event)?.forEach((fn) => fn()));
    },
    listenerCount: () =>
      [...listeners.values()].reduce((n, set) => n + set.size, 0),
  };
}

describe('useEmblaState', () => {
  it('reads the api as it is when it first arrives', () => {
    const { api } = fakeApi({ index: 2, prev: true, next: false });

    const { result } = renderHook(() => useEmblaState(api));

    expect(result.current).toEqual({
      selectedIndex: 2,
      canScrollPrev: true,
      canScrollNext: false,
    });
  });

  it('is at rest, and quiet, before there is an api', () => {
    const { result } = renderHook(() => useEmblaState(undefined));

    expect(result.current).toEqual({
      selectedIndex: 0,
      canScrollPrev: false,
      canScrollNext: false,
    });
  });

  it('follows a select and a reInit (the slide count changing)', () => {
    const fake = fakeApi();
    const { result } = renderHook(() => useEmblaState(fake.api));

    fake.move({ index: 1, prev: true, next: true });
    expect(result.current.selectedIndex).toBe(1);

    fake.move({ index: 0, prev: false, next: false }, 'reInit');
    expect(result.current).toEqual({
      selectedIndex: 0,
      canScrollPrev: false,
      canScrollNext: false,
    });
  });

  it('removes its listeners on unmount, so none stack up', () => {
    const fake = fakeApi();
    const { unmount } = renderHook(() => useEmblaState(fake.api));
    expect(fake.listenerCount()).toBe(2);

    unmount();

    expect(fake.listenerCount()).toBe(0);
  });
});
