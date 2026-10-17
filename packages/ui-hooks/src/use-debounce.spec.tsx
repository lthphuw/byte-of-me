import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';

import { useDebounce } from './use-debounce';

const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, ms));
  });

describe('useDebounce', () => {
  it('starts at the value it is given', () => {
    const { result } = renderHook(() => useDebounce('a', 20));

    expect(result.current).toBe('a');
  });

  it('holds the old value until the new one has been still for the wait', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 40),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'b' });
    expect(result.current).toBe('a');
    await wait(80);

    expect(result.current).toBe('b');
  });

  it('restarts the wait on every change, so only the last value lands', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 60),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'b' });
    await wait(30);
    rerender({ value: 'c' });
    await wait(30);
    expect(result.current).toBe('a');
    await wait(60);

    expect(result.current).toBe('c');
  });
});
