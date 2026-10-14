import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

import { useClipboard } from './use-clipboard';

const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
}

beforeEach(() => stubClipboard(mock(() => Promise.resolve())));

afterEach(() => {
  if (original) Object.defineProperty(navigator, 'clipboard', original);
  else delete (navigator as { clipboard?: unknown }).clipboard;
});

describe('useClipboard', () => {
  it('writes the text, reports success, and sets copied', async () => {
    const writeText = mock((_text: string) => Promise.resolve());
    stubClipboard(writeText);
    const { result } = renderHook(() => useClipboard());

    let ok = false;
    await act(async () => {
      ok = await result.current.copy('hello');
    });

    expect(writeText).toHaveBeenCalledWith('hello');
    expect(ok).toBe(true);
    expect(result.current.copied).toBe(true);
  });

  it('clears copied after the timeout', async () => {
    const { result } = renderHook(() => useClipboard({ timeout: 30 }));

    await act(async () => {
      await result.current.copy('x');
    });
    expect(result.current.copied).toBe(true);
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 70));
    });

    expect(result.current.copied).toBe(false);
  });

  it('reports a refusal instead of throwing, and does not claim it copied', async () => {
    stubClipboard(() => Promise.reject(new Error('denied')));
    const { result } = renderHook(() => useClipboard());

    let ok = true;
    await act(async () => {
      ok = await result.current.copy('x');
    });

    expect(ok).toBe(false);
    expect(result.current.copied).toBe(false);
  });

  it('copes with a browser that has no clipboard at all', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    const { result } = renderHook(() => useClipboard());

    let ok = true;
    await act(async () => {
      ok = await result.current.copy('x');
    });

    expect(ok).toBe(false);
  });

  it('returns the same copy function while its timeout is unchanged', () => {
    const { result, rerender } = renderHook(() => useClipboard());
    const first = result.current.copy;

    rerender();

    expect(result.current.copy).toBe(first);
  });
});
