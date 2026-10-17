/**
 * Runs the real getAuthenticatedAdmin against a fake `auth()` (stubbed in the global preload).
 * `env` is a mutable process singleton: capture OWNER_EMAIL at boot, restore it in afterEach and set
 * it per test, or later requireAdmin() specs throw Unauthorized (build.module is process-global).
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';

import { env } from '@/shared/config/env';

type FakeUser = { role?: string; email?: string } | null;
type FakeSession = { user: FakeUser } | null;

// Exists only on the preload's stub for this specifier, so the dynamic import is asserted
// to this shape instead of typed against the real module.
type StubbedAuthAuthModule = {
  __setFakeAuthSession: (session: FakeSession) => void;
};

import type * as SessionModule from './session';

let getAuthenticatedAdmin: typeof SessionModule.getAuthenticatedAdmin;
let isSiteOwnerEmail: typeof SessionModule.isSiteOwnerEmail;
let setFakeAuthSession: (session: FakeSession) => void;

// Boot value of OWNER_EMAIL: restored after every test, never asserted on.
let bootOwnerEmail: string | undefined;

beforeAll(async () => {
  bootOwnerEmail = env.OWNER_EMAIL;

  const authAuthModule = (await import(
    '@/shared/lib/auth/auth'
  )) as unknown as StubbedAuthAuthModule;
  setFakeAuthSession = authAuthModule.__setFakeAuthSession;

  ({ getAuthenticatedAdmin, isSiteOwnerEmail } = await import('./session'));
});

afterEach(() => {
  env.OWNER_EMAIL = bootOwnerEmail;
  // `fakeAuthSession` lives in the preload with process-wide lifetime: reset it here, not in one
  // describe's beforeEach, so no file leaves a valid owner session bound for later specs.
  setFakeAuthSession(null);
});

describe('getAuthenticatedAdmin', () => {
  beforeEach(() => {
    // OWNER_EMAIL is forced unset because these tests treat env.EMAIL as the owner identity;
    // the file-level afterEach restores the boot value and resets fakeAuthSession to null.
    env.OWNER_EMAIL = undefined;
  });

  it('returns the user when the session is an ADMIN whose email equals env.EMAIL', async () => {
    setFakeAuthSession({ user: { role: 'ADMIN', email: env.EMAIL } });

    const result = await getAuthenticatedAdmin();

    expect(result).not.toBeNull();
    expect(result?.email).toBe(env.EMAIL);
  });

  it('returns null for an ADMIN whose email is a different address', async () => {
    setFakeAuthSession({
      user: { role: 'ADMIN', email: 'not-the-owner@example.com' },
    });

    expect(await getAuthenticatedAdmin()).toBeNull();
  });

  it('returns null for a non-admin whose email happens to equal env.EMAIL', async () => {
    setFakeAuthSession({ user: { role: 'USER', email: env.EMAIL } });

    expect(await getAuthenticatedAdmin()).toBeNull();
  });

  it('returns null when there is no session at all', async () => {
    setFakeAuthSession(null);

    expect(await getAuthenticatedAdmin()).toBeNull();
  });

  it('matches the owner despite case and surrounding whitespace differences', async () => {
    setFakeAuthSession({
      user: { role: 'ADMIN', email: `  ${env.EMAIL.toUpperCase()}  ` },
    });

    const result = await getAuthenticatedAdmin();

    expect(result).not.toBeNull();
  });

  it('returns null when the session carries an ADMIN role but no email at all', async () => {
    setFakeAuthSession({ user: { role: 'ADMIN', email: undefined } });

    expect(await getAuthenticatedAdmin()).toBeNull();
  });
});

describe('isSiteOwnerEmail', () => {
  // Boot-value capture and restore live in the top-level beforeAll/afterEach; each test below
  // still sets its own OWNER_EMAIL precondition.

  it('matches EMAIL when OWNER_EMAIL is unset', () => {
    // Precondition is established here, not inherited from the ambient
    // environment, so this test is correct whether or not the process
    // actually booted with OWNER_EMAIL set.
    env.OWNER_EMAIL = undefined;

    expect(isSiteOwnerEmail(env.EMAIL)).toBe(true);
  });

  it('prefers OWNER_EMAIL over EMAIL once OWNER_EMAIL is set to a different address', () => {
    env.OWNER_EMAIL = 'owner-only@example.com';

    expect(isSiteOwnerEmail('owner-only@example.com')).toBe(true);
    expect(isSiteOwnerEmail(env.EMAIL)).toBe(false);
  });

  it('rejects an address that is neither OWNER_EMAIL nor EMAIL', () => {
    env.OWNER_EMAIL = undefined;

    expect(isSiteOwnerEmail('nobody@example.com')).toBe(false);
  });

  it('rejects null and undefined', () => {
    env.OWNER_EMAIL = undefined;

    expect(isSiteOwnerEmail(null)).toBe(false);
    expect(isSiteOwnerEmail(undefined)).toBe(false);
  });

  it('matches despite case and surrounding whitespace differences', () => {
    env.OWNER_EMAIL = undefined;

    expect(isSiteOwnerEmail(`  ${env.EMAIL.toUpperCase()}  `)).toBe(true);
  });
});
