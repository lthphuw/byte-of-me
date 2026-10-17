import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { useIntersection } from './use-intersection';

const RealObserver = globalThis.IntersectionObserver;
let created: IntersectionObserverInit[] = [];

class RecordingObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: readonly number[] = [];
  constructor(
    _callback: IntersectionObserverCallback,
    init: IntersectionObserverInit = {}
  ) {
    created.push(init);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeEach(() => {
  created = [];
  globalThis.IntersectionObserver = RecordingObserver;
});

afterEach(() => {
  globalThis.IntersectionObserver = RealObserver;
});

describe('useIntersection', () => {
  it('observes an element once, with the options it was given', () => {
    const { result } = renderHook(() =>
      useIntersection({ rootMargin: '200px', threshold: 0.5 })
    );

    result.current.ref(document.createElement('div'));

    expect(created).toEqual([
      { root: undefined, rootMargin: '200px', threshold: 0.5 },
    ]);
  });

  it('keeps the same ref when a caller passes a new array of the same thresholds', () => {
    const { result, rerender } = renderHook(() =>
      useIntersection({ threshold: [0, 0.5, 1] })
    );
    const first = result.current.ref;

    rerender();

    expect(result.current.ref).toBe(first);
  });

  it('gets a new ref when the thresholds really change', () => {
    const { result, rerender } = renderHook(
      ({ threshold }) => useIntersection({ threshold }),
      { initialProps: { threshold: [0] } }
    );
    const first = result.current.ref;

    rerender({ threshold: [0, 1] });

    expect(result.current.ref).not.toBe(first);
  });
});
