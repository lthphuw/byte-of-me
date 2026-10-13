/**
 * One click starts one purge, and a completed purge reports success. A refused
 * purge rejects from the action, is toasted once, and never rejects the click
 * handler. The real server action runs, so the refusal comes from `requireAdmin`.
 */
import { logger } from '@byte-of-me/logger';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

import { purgeEntireCache } from './purge-entire-cache';
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
        cacheError: 'Update failed',
      },
    },
  },
} as const;

// `logger.info` is what the action writes on a completed purge, so counting it
// counts purges — there is nothing else observable, `revalidatePath` being a
// preload no-op.
const logInfo = spyOn(logger, 'info');
// Only the failure toast is spyable: the success one is sonner's bare
// `toast(...)` call, and a plain function has no property to replace. That is
// enough to tell the two branches apart, which is the whole contract here.
const toastError = spyOn(toast, 'error');

function renderClearCache() {
  const queryClient = new QueryClient();
  return renderHook(() => useClearCache(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale="en" messages={messages}>
          {children}
        </NextIntlClientProvider>
      </QueryClientProvider>
    ),
  });
}

beforeEach(() => {
  logInfo.mockClear();
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
  toastError.mockRestore();
});

describe('useClearCache', () => {
  test('a second click while a purge is in flight starts no second purge', async () => {
    const { result } = renderClearCache();

    await act(async () => {
      // Both dispatched before either has resolved — the shape of a double
      // click on a button that shows nothing for the first one.
      await Promise.all([
        result.current.clearCache(),
        result.current.clearCache(),
      ]);
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

    // Resolves rather than rejects: the refusal is toasted, never rethrown.
    await act(async () => {
      await result.current.clearCache();
    });

    resetTestUser();

    expect(toastError).toHaveBeenCalledTimes(1);
    // Nothing reached the success branch: the action never got as far as its
    // completion log.
    expect(logInfo).not.toHaveBeenCalled();
  });
});

describe('purgeEntireCache', () => {
  test('rejects a refused caller before any purge runs', async () => {
    setTestUser(null);

    try {
      await expect(purgeEntireCache()).rejects.toThrow('Unauthorized');
      expect(logInfo).not.toHaveBeenCalled();
    } finally {
      resetTestUser();
    }
  });
});
