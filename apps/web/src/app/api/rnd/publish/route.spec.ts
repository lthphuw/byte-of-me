import { prisma } from '@byte-of-me/db';
import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';

import { isAuthorizedRndToken, POST } from './route';

import { env } from '@/shared/config/env';
import { normalizeEmail } from '@/shared/lib/auth';

describe('isAuthorizedRndToken', () => {
  const token = 'a'.repeat(40);

  it('rejects when no token is configured, rather than allowing everything', () => {
    expect(isAuthorizedRndToken(`Bearer ${token}`, undefined)).toBe(false);
  });

  it('rejects a missing header', () => {
    expect(isAuthorizedRndToken(null, token)).toBe(false);
  });

  it('rejects a header without the Bearer scheme', () => {
    expect(isAuthorizedRndToken(token, token)).toBe(false);
  });

  it('rejects a wrong token of the same length', () => {
    expect(isAuthorizedRndToken(`Bearer ${'b'.repeat(40)}`, token)).toBe(false);
  });

  it('rejects a wrong token of a different length without throwing', () => {
    expect(isAuthorizedRndToken('Bearer short', token)).toBe(false);
  });

  it('accepts the configured token', () => {
    expect(isAuthorizedRndToken(`Bearer ${token}`, token)).toBe(true);
  });

  // env.ts no longer enforces a minimum length on RND_PUBLISH_TOKEN (a
  // set-but-short value there would fail env validation at import time and
  // take the whole site down at boot — see the comment on that field). The
  // 32-character floor moved here, so it has to be pinned here: a configured
  // token under that length must be treated as no token at all, even when it
  // matches the header exactly — matching is not enough to authorize.
  it('rejects a configured token shorter than 32 characters, even when it matches the header exactly', () => {
    const shortToken = 'a'.repeat(31);
    expect(isAuthorizedRndToken(`Bearer ${shortToken}`, shortToken)).toBe(false);
  });

  it('accepts a configured token at exactly the 32-character floor', () => {
    const floorToken = 'a'.repeat(32);
    expect(isAuthorizedRndToken(`Bearer ${floorToken}`, floorToken)).toBe(true);
  });
});

/**
 * These four cover the route paths that never reach `publishRndProject`, so
 * they need no mock of it — only the `env` singleton (mutated and restored
 * exactly like `session.spec.ts` and `log-in-to-dashboard.spec.ts` already
 * do) and, for the last one, a faked `prisma.user` delegate in the same style
 * `publish-rnd-project.spec.ts` uses for `note`/`noteLink`/`$transaction`.
 * The success/failure status-code mapping at the very end of `POST` is left
 * untested: it needs `publishRndProject` itself substituted, and this repo
 * has no sanctioned way to replace a bare named import of a non-Prisma
 * module (`mock.module()` is unused repo-wide and forbidden by AGENTS.md).
 */
describe('POST', () => {
  const validToken = 'a'.repeat(40);

  const validBody = {
    project: 'test-project',
    title: 'Test Project',
    notesRoot: 'R&D/test-project',
    files: [
      {
        path: 'notes/one.md',
        frontmatter: { title: 'One' },
        markdown: '# One',
      },
    ],
    deleted: [] as string[],
  };

  const findFirst = mock();
  Object.defineProperty(prisma, 'user', {
    value: { findFirst },
    writable: true,
    configurable: true,
  });

  // Captured once and restored after every test, same as `session.spec.ts` —
  // these two keys are read straight off the shared `env` singleton by
  // `POST`, so a test that sets them must put them back or it leaks into
  // whichever spec runs next in this process.
  let bootToken: string | undefined;
  let bootOwnerEmail: string | undefined;

  beforeAll(() => {
    bootToken = env.RND_PUBLISH_TOKEN;
    bootOwnerEmail = env.RND_PUBLISH_OWNER_EMAIL;
  });

  afterEach(() => {
    env.RND_PUBLISH_TOKEN = bootToken;
    env.RND_PUBLISH_OWNER_EMAIL = bootOwnerEmail;
    findFirst.mockReset();
  });

  function request(body: BodyInit, authToken = validToken): Request {
    return new Request('http://localhost/api/rnd/publish', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${authToken}`,
        'content-type': 'application/json',
      },
      body,
    });
  }

  it('returns 401 when RND_PUBLISH_OWNER_EMAIL is unset, even with a valid token and header', async () => {
    env.RND_PUBLISH_TOKEN = validToken;
    env.RND_PUBLISH_OWNER_EMAIL = undefined;
    // If the missing-owner-email guard were ever removed, the request must
    // not merely coincide with a 401 by falling through to the "no user
    // found" branch — that branch returns 401 too, for a different reason,
    // and would mask the guard's absence. Priming `findFirst` to resolve an
    // owner means a broken guard would instead reach the real (unmocked)
    // `prisma.$transaction` inside `publishRndProject`, which fails against
    // the unreachable test database and comes back as 500 — a status this
    // test would actually catch.
    findFirst.mockResolvedValueOnce({ id: 'owner_1' });

    const res = await POST(request(JSON.stringify(validBody)));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({ success: false, errorMsg: 'Unauthorized' });
  });

  // `env.EMAIL` is the site owner address in this test environment (no
  // `OWNER_EMAIL` override is set — see `apps/web/.env`), so these three use
  // it rather than an arbitrary address: the new `isSiteOwnerEmail` gate
  // (Finding 4) would otherwise 401 every one of them before they ever
  // reached the code path each test means to exercise.
  it('returns 400 for a body that is not JSON', async () => {
    env.RND_PUBLISH_TOKEN = validToken;
    env.RND_PUBLISH_OWNER_EMAIL = env.EMAIL;

    const res = await POST(request('not json'));

    expect(res.status).toBe(400);
  });

  it('returns 400 for well-formed JSON that fails the schema', async () => {
    env.RND_PUBLISH_TOKEN = validToken;
    env.RND_PUBLISH_OWNER_EMAIL = env.EMAIL;

    const res = await POST(request(JSON.stringify({})));

    expect(res.status).toBe(400);
  });

  it('returns a generic 401 when the owner email matches no user, revealing nothing about whether the address exists', async () => {
    env.RND_PUBLISH_TOKEN = validToken;
    env.RND_PUBLISH_OWNER_EMAIL = env.EMAIL;
    findFirst.mockResolvedValueOnce(null);

    const res = await POST(request(JSON.stringify(validBody)));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({ success: false, errorMsg: 'Unauthorized' });
  });

  // Every other write path into the vault routes through `isSiteOwnerEmail()`
  // (`docs/notes.md` §1: the vault is identity-gated, "even a second ADMIN
  // row cannot enter"). Before this fix, RND_PUBLISH_OWNER_EMAIL was resolved
  // to ANY User row — a typo naming another registered user would publish
  // straight into their vault. `findFirst` is primed to resolve a real owner,
  // same defensive pattern as the owner-email-unset test above: if the gate
  // were ever removed, this would fall through to a real (unmocked)
  // `publishRndProject` call and surface as a 500 against the unreachable
  // test database — a status this test would catch — rather than coincide
  // with the 401 this test expects for the right reason.
  it('returns 401 when RND_PUBLISH_OWNER_EMAIL does not match the site owner, even though it matches a registered user', async () => {
    env.RND_PUBLISH_TOKEN = validToken;
    env.RND_PUBLISH_OWNER_EMAIL = 'someone-else@example.com';
    findFirst.mockResolvedValueOnce({ id: 'owner_1' });

    const res = await POST(request(JSON.stringify(validBody)));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({ success: false, errorMsg: 'Unauthorized' });
    // Asserted before the lookup, not just before the write: the owner
    // lookup itself must never run for a non-owner address.
    expect(findFirst).not.toHaveBeenCalled();
  });

  // `User.email` is written by Auth.js from the provider's raw value and
  // nothing in this repo lowercases it — an exact-match lookup would 401 the
  // owner permanently the day their address is stored with different casing.
  it('looks the owner up case-insensitively', async () => {
    env.RND_PUBLISH_TOKEN = validToken;
    env.RND_PUBLISH_OWNER_EMAIL = env.EMAIL;
    findFirst.mockResolvedValueOnce({ id: 'owner_1' });

    await POST(request(JSON.stringify(validBody)));

    expect(findFirst).toHaveBeenCalledWith({
      where: { email: { equals: normalizeEmail(env.EMAIL), mode: 'insensitive' } },
      select: { id: true },
    });
  });
});
