/**
 * `logInToDashboard` must delegate the owner check to `isSiteOwnerEmail`, not a private copy. The
 * preload stubs `@/shared/lib/auth` globally with the REAL function (a local `build.module` would
 * clobber other specs), so tests pin `env.OWNER_EMAIL` and restore it.
 */
import { afterEach, beforeAll, describe, expect, it } from 'bun:test';

import type * as LogInToDashboardModule from './log-in-to-dashboard';

import { env } from '@/shared/config/env';

let logInToDashboard: typeof LogInToDashboardModule.logInToDashboard;
let bootOwnerEmail: string | undefined;

beforeAll(async () => {
  bootOwnerEmail = env.OWNER_EMAIL;

  ({ logInToDashboard } = await import('./log-in-to-dashboard'));
});

afterEach(() => {
  env.OWNER_EMAIL = bootOwnerEmail;
});

describe('logInToDashboard', () => {
  it('refuses a non-owner address', async () => {
    env.OWNER_EMAIL = undefined;

    const res = await logInToDashboard(
      'not-the-owner@example.com',
      '/en/dashboard'
    );

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBe('Invalid email, try again later');
  });

  it('accepts the owner address despite case and whitespace differences', async () => {
    // Pinned explicitly, not inherited from whatever this process actually
    // booted with, so `env.EMAIL` is guaranteed to be the effective owner
    // identity for this assertion regardless of ambient OWNER_EMAIL.
    env.OWNER_EMAIL = undefined;

    const res = await logInToDashboard(
      `  ${env.EMAIL.toUpperCase()}  `,
      '/en/dashboard'
    );

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    // Proves the stubbed `signIn` was actually reached — a refused caller
    // never gets this far, so a non-empty result here is only possible
    // through the accept branch.
    expect(res.data).toBeTruthy();
  });
});
