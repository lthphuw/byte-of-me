import type { ReactNode } from 'react';
import { createElement } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { toast } from 'sonner';

import { isRedirectSignal, useServerMutation } from './use-server-mutation';

import { makeQueryClient } from '@/shared/lib/query/get-query-client';
import { ServerActionError } from '@/shared/lib/query/unwrap-api-response';

afterEach(() => {
  cleanup();
});

function wrapperFor(client = makeQueryClient()) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

describe('isRedirectSignal', () => {
  test('recognises the rejection a server action makes when it redirects', () => {
    const rejection = Object.assign(new Error('NEXT_REDIRECT'), {
      digest: 'NEXT_REDIRECT;push;/en/dashboard;307;',
    });

    expect(isRedirectSignal(rejection)).toBe(true);
  });

  test('does not treat a refused action as a redirect', () => {
    expect(
      isRedirectSignal(new ServerActionError('Not allowed', 'forbidden'))
    ).toBe(false);
  });

  test('does not treat a network failure as a redirect', () => {
    expect(isRedirectSignal(new TypeError('Failed to fetch'))).toBe(false);
  });

  test('accepts values that carry no digest at all', () => {
    expect(isRedirectSignal(undefined)).toBe(false);
    expect(isRedirectSignal('boom')).toBe(false);
  });
});

describe('useServerMutation', () => {
  test('does not run onSuccess and shows the error toast when the call rejects', async () => {
    const spyError = spyOn(toast, 'error').mockImplementation(() => 1);
    const spyConsole = spyOn(console, 'error').mockImplementation(() => {});
    const onSuccess = mock(() => {});
    const { result } = renderHook(
      () =>
        useServerMutation<void, null>({
          mutationFn: async () => ({
            success: false,
            errorMsg: 'Session expired',
            errorCode: 'unauthorized',
          }),
          errorMessage: 'Could not save',
          onSuccess,
        }),
      { wrapper: wrapperFor() }
    );

    act(() => {
      result.current.mutate(undefined);
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(onSuccess).not.toHaveBeenCalled();
    expect(spyError).toHaveBeenCalledWith('Could not save');
    spyError.mockRestore();
    spyConsole.mockRestore();
  });

  test('reports a successful write with toast.success', async () => {
    const spySuccess = spyOn(toast, 'success').mockImplementation(() => 1);
    const { result } = renderHook(
      () =>
        useServerMutation<void, null>({
          mutationFn: async () => ({ success: true, data: null }),
          successMessage: 'Saved',
        }),
      { wrapper: wrapperFor() }
    );

    act(() => {
      result.current.mutate(undefined);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spySuccess).toHaveBeenCalledWith('Saved');
    spySuccess.mockRestore();
  });
});
