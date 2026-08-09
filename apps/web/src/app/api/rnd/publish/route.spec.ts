import { prisma } from '@byte-of-me/db';
import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';

import { isAuthorizedRndToken, POST } from './route';

import { env } from '@/shared/config/env';

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

  it('returns 400 for a body that is not JSON', async () => {
    env.RND_PUBLISH_TOKEN = validToken;
    env.RND_PUBLISH_OWNER_EMAIL = 'owner@example.com';

    const res = await POST(request('not json'));

    expect(res.status).toBe(400);
  });

  it('returns 400 for well-formed JSON that fails the schema', async () => {
    env.RND_PUBLISH_TOKEN = validToken;
    env.RND_PUBLISH_OWNER_EMAIL = 'owner@example.com';

    const res = await POST(request(JSON.stringify({})));

    expect(res.status).toBe(400);
  });

  it('returns a generic 401 when the owner email matches no user, revealing nothing about whether the address exists', async () => {
    env.RND_PUBLISH_TOKEN = validToken;
    env.RND_PUBLISH_OWNER_EMAIL = 'owner@example.com';
    findFirst.mockResolvedValueOnce(null);

    const res = await POST(request(JSON.stringify(validBody)));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({ success: false, errorMsg: 'Unauthorized' });
  });
});
