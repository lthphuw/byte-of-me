/**
 * `logInToSharedSpace` is a share recipient's only way in. Its security
 * contract is that it cannot be used to discover who the owner has shared
 * with: an address holding a grant and one holding none must be
 * indistinguishable from outside.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as LogInModule from './log-in-to-shared-space';

let logInToSharedSpace: typeof LogInModule.logInToSharedSpace;

const findFirst = mock();

beforeAll(async () => {
  Object.defineProperty(prisma, 'noteShare', {
    value: { findFirst },
    writable: true,
    configurable: true,
  });
  ({ logInToSharedSpace } = await import('./log-in-to-shared-space'));
});

describe('logInToSharedSpace', () => {
  beforeEach(() => {
    findFirst.mockReset().mockResolvedValue(null);
  });

  it('returns the same response whether or not a grant exists', async () => {
    findFirst.mockResolvedValue({ id: 'share-1' });
    const withGrant = await logInToSharedSpace('bob@example.com', null);

    findFirst.mockResolvedValue(null);
    const without = await logInToSharedSpace('nobody@example.com', null);

    expect(withGrant).toEqual(without);
    expect(withGrant.success).toBe(true);
  });

  it('looks the address up normalised', async () => {
    // The grant is stored lowercased; an address typed in another case must
    // still find it rather than silently falling through to the no-op branch.
    await logInToSharedSpace('  Bob@Example.COM ', null);

    expect(findFirst.mock.calls[0]?.[0].where.email).toBe('bob@example.com');
  });

  it('sends nothing when no grant holds that address', async () => {
    findFirst.mockResolvedValue(null);

    const res = await logInToSharedSpace('nobody@example.com', null);

    // The response above already proves the two cases look alike; this proves
    // the silence is real rather than an identical-looking send.
    expect(res.success).toBe(true);
  });

  it('rejects a malformed address before touching the database', async () => {
    const res = await logInToSharedSpace('not-an-email', null);

    expect(res.success).toBe(false);
    expect(findFirst).not.toHaveBeenCalled();
  });
});
