import { describe, expect, test } from 'bun:test';

import { isRedirectSignal } from './use-server-mutation';

import { ServerActionError } from '@/shared/lib/query/unwrap-api-response';

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
