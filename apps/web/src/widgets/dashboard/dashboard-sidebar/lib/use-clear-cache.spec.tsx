/**
 * What this spec defends about the Clear Cache button's only two guarantees:
 * one click means one purge, and a purge that did not happen never reports
 * that it did.
 *
 * Both were broken. The callers were a bare `void clearCache()` with no pending
 * state, so a full-layout revalidate — which is not instant — looked exactly
 * like a click that had not registered, and the natural response started a
 * second purge. And `purgeEntireCache` catches its own failures and returns
 * them in an envelope rather than throwing, which made the hook's `catch`
 * unreachable: an unauthorized purge toasted "System updated".
 *
 * The real server action runs here — `revalidatePath` is the preload's no-op
 * and `requireAdmin` is the preload's identity stub, so the failure path is
 * reached by actually removing the caller's identity rather than by
 * constructing an error (AGENTS §10).
 */
import { logger } from '@byte-of-me/logger';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';

import { useClearCache } from './use-clear-cache';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

const messages = {
  dashboard: {
    sidebar: {
      actions: {
        cacheSuccess: 'System updated',
        cacheSuccessDesc: 'All caches have been cleared successfully.',
        cacheError: 'Update failed',
        cacheErrorDesc: 'An error occurred while clearing caches.',
      },
    },
  },
} as const;

// `logger.info` is what the action writes on a completed purge, so counting it
// counts purges — there is nothing else observable, `revalidatePath` being a
// preload no-op.
const logInfo = spyOn(logger, 'info');
const logError = spyOn(logger, 'error');
// Only the failure toast is spyable: the success one is sonner's bare
// `toast(...)` call, and a plain function has no property to replace. That is
// enough to tell the two branches apart, which is the whole contract here.
const toastError = spyOn(toast, 'error');

function renderClearCache() {
  return renderHook(() => useClearCache(), {
    wrapper: ({ children }) => (
      <NextIntlClientProvider locale="en" messages={messages}>
        {children}
      </NextIntlClientProvider>
    ),
  });
}

beforeEach(() => {
  logInfo.mockClear();
  logError.mockClear();
  toastError.mockClear();
});

afterEach(() => {
  cleanup();
});

afterAll(() => {
  // A single mutable identity is shared by every spec in the process; a file
  // that leaves it cleared makes an unrelated action throw "Unauthorized".
  resetTestUser();
  logInfo.mockRestore();
  logError.mockRestore();
  toastError.mockRestore();
});

describe('useClearCache', () => {
  test('a second click while a purge is in flight starts no second purge', async () => {
    const { result } = renderClearCache();

    await act(async () => {
      // Both dispatched before either has resolved — the shape of a double
      // click on a button that shows nothing for the first one.
      await Promise.all([result.current.clearCache(), result.current.clearCache()]);
    });

    expect(logInfo).toHaveBeenCalledTimes(1);
  });

  test('reports success once the purge has actually completed', async () => {
    const { result } = renderClearCache();

    await act(async () => {
      await result.current.clearCache();
    });

    expect(logInfo).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
    // And the button is usable again.
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  test('reports a refused purge as a failure, not as a success', async () => {
    setTestUser(null);
    const { result } = renderClearCache();

    await act(async () => {
      await result.current.clearCache();
    });

    resetTestUser();

    // The envelope IS the failure path: `purgeEntireCache` swallows the
    // `requireAdmin` throw and reports `success: false`, so a hook that only
    // watches for a rejection announces "System updated" for a purge that
    // never ran.
    expect(toastError).toHaveBeenCalledTimes(1);
    // Nothing reached the success branch: the action never got as far as its
    // completion log.
    expect(logInfo).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledTimes(1);
  });
});
