import { describe, expect, test } from 'bun:test';

import { ServerActionError, unwrapApiResponse } from './unwrap-api-response';

/** Runs `run` and returns what it threw, failing the test if it returned. */
function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error('expected the call to throw');
}

describe('unwrapApiResponse', () => {
  test('returns the data of a successful envelope', () => {
    expect(unwrapApiResponse({ success: true, data: 42 })).toBe(42);
  });

  test('throws a ServerActionError whose message is the errorMsg', () => {
    const error = thrownBy(() =>
      unwrapApiResponse({ success: false, errorMsg: 'Not allowed' })
    );

    expect(error).toBeInstanceOf(ServerActionError);
    expect((error as ServerActionError).message).toBe('Not allowed');
  });

  test('exposes the errorCode the action named', () => {
    const error = thrownBy(() =>
      unwrapApiResponse({
        success: false,
        errorMsg: 'Too many requests',
        errorCode: 'rate-limited',
      })
    );

    expect((error as ServerActionError).errorCode).toBe('rate-limited');
  });

  test('leaves errorCode undefined when the action names no reason', () => {
    const error = thrownBy(() =>
      unwrapApiResponse({ success: false, errorMsg: 'Something failed' })
    );

    expect((error as ServerActionError).errorCode).toBeUndefined();
  });
});
