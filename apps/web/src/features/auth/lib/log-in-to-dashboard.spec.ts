/**
 * `logInToDashboard` is the sign-in form's own owner-identity gate — the
 * second place `isSiteOwnerEmail` had to be threaded through (see the
 * finding this spec closes: the guard in `session.ts` normalised case and
 * whitespace, but this action's original inline `email !== env.EMAIL` check
 * did not, so a real owner typing `LTHPhuw@gmail.com` was refused at the
 * form before the normalised guard ever ran). What this spec defends is
 * that this action now delegates to the shared helper rather than carrying
 * its own copy of the rule.
 *
 * This spec runs against `apps/web/next-runtime-stubs.ts`'s *global* stub of
 * `@/shared/lib/auth` (not a locally-registered override — `build.module`
 * registrations are process-global, per the note in `session.spec.ts`, so a
 * second registration for the same barrel here would clobber every other
 * spec's auth stub instead of only this file's). The stub's
 * `isSiteOwnerEmail` is the *real* function (lazily imported from
 * `@/shared/lib/auth/session`, not a hand copy — see `next-runtime-stubs.ts`),
 * so this spec exercises the actual identity rule through the action's own
 * contract: that it calls `isSiteOwnerEmail` and branches on the result.
 *
 * Because the stub is the real function, it reads the real
 * `env.OWNER_EMAIL ?? env.EMAIL` fallback — so, like `session.spec.ts`, this
 * file cannot assume `env.EMAIL` is the effective owner identity without
 * first pinning `env.OWNER_EMAIL` for the duration of a test. The boot value
 * is captured once and restored after every test for the same reason
 * documented there: leaving `OWNER_EMAIL` mutated would desync
 * `next-runtime-stubs.ts`'s default test identity from what `isSiteOwnerEmail`
 * actually reads, breaking unrelated specs later in the same process.
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
