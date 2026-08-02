/**
 * `getAuthenticatedAdmin` is the single choke point every `requireAdmin()`
 * call site funnels through (AGENTS §5) — narrowing it from "role is ADMIN"
 * to "role is ADMIN *and* identity is the site owner" is the entire change
 * this task makes. What this spec defends is that narrowed contract: the
 * six scenarios below are the ones a regression could silently reintroduce
 * (a second ADMIN regaining access) or silently break (the real owner
 * getting locked out).
 *
 * `session.ts` reaches `@/shared/lib/auth/auth`, which builds a real Auth.js
 * instance at module load (PrismaAdapter, nodemailer, provider secrets) —
 * not something to construct in a unit test. `apps/web/next-runtime-stubs.ts`
 * already stubs the `@/shared/lib/auth` *barrel* globally for every other
 * spec's benefit, but that stub hard-codes the narrowed rule's outcome
 * rather than exercising it — it cannot be the thing this spec verifies.
 *
 * The `@/shared/lib/auth/auth` submodule (not the barrel) is stubbed
 * separately, controllable via `__setFakeAuthSession`, so the real
 * `getAuthenticatedAdmin` below runs against a controllable fake `auth()`
 * rather than a fake `getAuthenticatedAdmin`. That stub is registered in
 * the *global* preload (`next-runtime-stubs.ts`), not locally in this file —
 * an earlier version of this spec registered its own `build.module`
 * interception of `@/shared/lib/auth/auth` here, which worked only as long
 * as nothing else in the suite ever reached that specifier. Once the
 * barrel stub started lazily importing the real `session.ts` (to re-export
 * the real `isSiteOwnerEmail` instead of a hand copy — see that file), any
 * spec's import graph could trigger `session.ts`'s own static import of
 * `@/shared/lib/auth/auth` *before* this file's local registration ran. The
 * lock-in is not `build.module` caching a registration (a later `plugin()`
 * call for the same specifier is last-wins, confirmed empirically, not a
 * no-op) — it is that `session.ts` itself, once evaluated, is cached as a
 * module and never re-evaluated, so its `auth` import stays bound to
 * whatever the specifier resolved to *at that first evaluation*. Whichever
 * spec's import graph reaches the barrel first permanently decides that
 * binding. Registering the stub in the preload instead — which completes
 * before any spec module is ever evaluated — closes that race
 * unconditionally, since nothing can evaluate `session.ts` before the
 * preload has already registered this stub. See `next-runtime-stubs.ts`'s
 * own comment on `stub-auth-submodule` for the full mechanism.
 *
 * The `isSiteOwnerEmail` block below tests that helper directly, imported
 * from the real `./session` module (not the global barrel stub), so it
 * exercises the actual `env.OWNER_EMAIL ?? env.EMAIL` fallback rather than
 * the stub's copy of it (see `next-runtime-stubs.ts` — that stub now
 * imports the real function too, so there is no copy left to drift, but
 * this block still owns proving the fallback itself is correct). `env`
 * (from `@t3-oss/env-nextjs`) is a plain, unfrozen object — confirmed
 * empirically — so a test can set `env.OWNER_EMAIL` directly to prove the
 * preference holds once it's configured, without registering another
 * `build.module` interception for `@/shared/config/env` (which, unlike
 * `@/shared/lib/auth/auth`, *is* reached by other spec files' import
 * graphs, so intercepting it here would leak into them — `build.module`
 * registrations are process-global, not scoped to the file that calls
 * `plugin()`, confirmed by reproducing the leak against
 * `get-note-tree.spec.ts` while writing this test).
 *
 * `env` is a singleton for the whole `bun test` process, and `bun test`
 * auto-loads `apps/web/.env` before any preload runs — so whatever
 * `env.OWNER_EMAIL` is at boot is whatever this repo's `.env` (or the
 * shell's environment) actually sets, which is not always unset. The whole
 * file therefore (a) captures that boot value exactly once, in the
 * top-level `beforeAll` below, and restores *that* — not a hardcoded
 * `undefined` — in a top-level `afterEach` that runs after every test in
 * this file, and (b) never asserts on the ambient value; every test that
 * cares what `OWNER_EMAIL` is establishes its own precondition explicitly
 * (`env.OWNER_EMAIL = undefined` or a specific address) as its first line,
 * so it is correct under any boot state, not only the one this repo's
 * `.env` happens to have today. Both halves matter for the same underlying
 * reason: `next-runtime-stubs.ts`'s default test identity captures
 * `env.OWNER_EMAIL ?? env.EMAIL` once, at plugin-setup time, while its
 * `isOwner` check reads `env` again at call time — so a test in this file
 * that permanently changed `OWNER_EMAIL` (via a hardcoded reset, or by
 * simply never restoring it) made the two disagree, and every
 * `requireAdmin()`-guarded spec that ran afterward in the same process
 * threw `Unauthorized`. Reproduced against `get-note-tree.spec.ts` while
 * fixing this; see the review-fix report for the exact repro.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

import { env } from '@/shared/config/env';

type FakeUser = { role?: string; email?: string } | null;
type FakeSession = { user: FakeUser } | null;

// The real shape of `@/shared/lib/auth/auth` doesn't export this — it only
// exists on `next-runtime-stubs.ts`'s stub for this specifier, which is why
// the dynamic import below is asserted to this shape rather than typed
// against the real module.
type StubbedAuthAuthModule = {
  __setFakeAuthSession: (session: FakeSession) => void;
};

import type * as SessionModule from './session';

let getAuthenticatedAdmin: typeof SessionModule.getAuthenticatedAdmin;
let isSiteOwnerEmail: typeof SessionModule.isSiteOwnerEmail;
let setFakeAuthSession: (session: FakeSession) => void;

// Captured once, from whatever this process actually booted with — never
// asserted on, only restored after every test in this file. See the file
// doc comment for why a hardcoded `undefined` here previously broke
// unrelated specs elsewhere in the suite.
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
  // `fakeAuthSession` is a closure variable in the preload with the same
  // process-wide scope and lifetime as the `env` singleton above — nothing
  // else resets it between spec files. Resetting it only inside
  // `describe('getAuthenticatedAdmin')`'s own `beforeEach` left whatever its
  // *last* test happened to set as this file's exit state; had the
  // case/whitespace test run last instead of the "no email" test, this file
  // would have left a valid owner session bound in the preload for every
  // spec that runs afterward. Hoisted to the file-level `afterEach` so the
  // reset is structural, not an accident of test order.
  setFakeAuthSession(null);
});

describe('getAuthenticatedAdmin', () => {
  beforeEach(() => {
    // `fakeAuthSession` is already reset to `null` by the file-level
    // `afterEach` after the previous test (and starts `null` by construction
    // for the very first test in the file), so this `beforeEach` only needs
    // to establish the precondition specific to this describe block.
    //
    // These tests reason about identity purely in terms of `env.EMAIL`, so
    // OWNER_EMAIL is forced unset for their duration — otherwise a process
    // that actually boots with OWNER_EMAIL set to something else would make
    // `env.EMAIL` stop being the effective owner identity, and these
    // assertions would fail for a reason that has nothing to do with a
    // regression. The top-level `afterEach` restores the real boot value
    // once each test finishes.
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
  // Boot-value capture and restore for `env.OWNER_EMAIL` is handled by the
  // top-level `beforeAll`/`afterEach` above, shared with
  // `describe('getAuthenticatedAdmin')`. Each test below still establishes
  // its own precondition explicitly (see the file doc comment).

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
