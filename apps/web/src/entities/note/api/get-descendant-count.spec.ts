/**
 * `getDescendantCount` answers "how many notes would a permanent delete take
 * with it" for a folder whose subtree has never been fetched.
 *
 * The client-side walk it replaces (`collectDescendantIds`) needed every row
 * in the corpus in memory, which is precisely the read the pagination work
 * removes. Doing it in SQL is not an optimisation here — it is the only way
 * to answer the question at all once the tree loads lazily.
 *
 * `$queryRaw` is replaced wholesale rather than spied on, matching how
 * `search-notes.spec.ts` handles the same situation.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as GetDescendantCountModule from './get-descendant-count';

let getDescendantCount: typeof GetDescendantCountModule.getDescendantCount;

beforeAll(async () => {
  ({ getDescendantCount } = await import('./get-descendant-count'));
});

const queryRaw = mock();
Object.defineProperty(prisma, '$queryRaw', {
  value: queryRaw,
  writable: true,
  configurable: true,
});

describe('getDescendantCount', () => {
  beforeEach(() => {
    queryRaw.mockReset().mockResolvedValue([{ count: 0 }]);
  });

  it('returns the count the database reports', async () => {
    queryRaw.mockResolvedValue([{ count: 7 }]);

    const res = await getDescendantCount('folder-1');

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data).toBe(7);
  });

  it('returns 0 for a leaf', async () => {
    queryRaw.mockResolvedValue([{ count: 0 }]);

    const res = await getDescendantCount('leaf-1');

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data).toBe(0);
  });

  it('passes both the note id and the owner id as parameters', async () => {
    await getDescendantCount('folder-1');

    // Owner scoping has to be IN the recursive walk, not applied after it:
    // a foreign subtree would otherwise be counted and its size leaked.
    const params = queryRaw.mock.calls[0]?.slice(1) ?? [];
    expect(params).toContain('folder-1');
    expect(params).toContain('admin-1');
  });

  it('rejects a malformed id before touching the database', async () => {
    const res = await getDescendantCount('');

    expect(res.success).toBe(false);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('survives an empty result set rather than returning undefined', async () => {
    queryRaw.mockResolvedValue([]);

    const res = await getDescendantCount('folder-1');

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data).toBe(0);
  });

  it('coerces a bigint count, which is what Postgres count() returns', async () => {
    // `count(*)` comes back as int8 and the driver hands it over as a BigInt.
    // Letting one through reaches React as an unserializable value and the
    // dialog renders nothing.
    queryRaw.mockResolvedValue([{ count: 12n }]);

    const res = await getDescendantCount('folder-1');

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data).toBe(12);
    expect(typeof res.data).toBe('number');
  });

  it('reports failure through errorMsg, never error', async () => {
    queryRaw.mockRejectedValue(new Error('connection refused'));

    const res = await getDescendantCount('folder-1');

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect((res as { error?: unknown }).error).toBeUndefined();
  });
});
