/**
 * `getNoteAncestors` answers "which folders is this note inside" for a tree
 * that loads one level at a time, so the explorer can expand the path to a
 * note opened from the palette or a `[[` link, and the editor header can draw
 * `Work / Sprints / Retro`.
 *
 * The contracts under test are the ones a caller can observe: the envelope,
 * the shape of a rung (snake_case columns arrive raw from `$queryRaw` and must
 * reach React camelCased), the order the chain is handed over in, and that a
 * malformed id never reaches the database. The recursion itself is Postgres's
 * job and is not restated here.
 *
 * `$queryRaw` is replaced wholesale rather than spied on, matching how
 * `get-descendant-count.spec.ts` and `search-notes.spec.ts` handle the same
 * situation.
 */
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';

import type * as GetNoteAncestorsModule from './get-note-ancestors';

let getNoteAncestors: typeof GetNoteAncestorsModule.getNoteAncestors;

beforeAll(async () => {
  ({ getNoteAncestors } = await import('./get-note-ancestors'));
});

const queryRaw = mock();
Object.defineProperty(prisma, '$queryRaw', {
  value: queryRaw,
  writable: true,
  configurable: true,
});

const logError = spyOn(logger, 'error');

describe('getNoteAncestors', () => {
  beforeEach(() => {
    queryRaw.mockReset().mockResolvedValue([]);
    logError.mockReset();
  });

  it('returns an empty chain for a root-level note', async () => {
    queryRaw.mockResolvedValue([]);

    const res = await getNoteAncestors('note-1');

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data).toEqual([]);
  });

  it('returns the chain root first, immediate parent last', async () => {
    // Exactly what `ORDER BY depth DESC` hands back: the breadcrumb renders
    // left to right without reversing, and the reveal expands outermost
    // folder first, so a chain delivered the other way round would open the
    // tree from the inside out.
    queryRaw.mockResolvedValue([
      { id: 'work', title: 'Work', is_folder: true },
      { id: 'sprints', title: 'Sprints', is_folder: true },
    ]);

    const res = await getNoteAncestors('retro');

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data).toEqual([
      { id: 'work', title: 'Work', isFolder: true },
      { id: 'sprints', title: 'Sprints', isFolder: true },
    ]);
  });

  it('camelCases is_folder, which the raw query returns snake_cased', async () => {
    // `$queryRaw` bypasses Prisma's `@map`, so the driver hands over the
    // column name verbatim. Passing the row through untouched would give
    // every consumer an `isFolder` of `undefined` and no error to say why.
    queryRaw.mockResolvedValue([
      { id: 'inbox', title: 'Inbox', is_folder: false },
    ]);

    const res = await getNoteAncestors('note-1');

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data[0]).toEqual({
      id: 'inbox',
      title: 'Inbox',
      isFolder: false,
    });
    expect(res.data[0]).not.toHaveProperty('is_folder');
  });

  it('passes both the note id and the owner id as parameters', async () => {
    await getNoteAncestors('retro');

    // Owner scoping has to be IN the walk, not applied to the result: an
    // upward walk that climbed past a foreign row would leak the existence
    // and the depth of someone else's folders.
    const params = queryRaw.mock.calls[0]?.slice(1) ?? [];
    expect(params).toContain('retro');
    expect(params).toContain('admin-1');
  });

  it('rejects a malformed id before touching the database', async () => {
    const res = await getNoteAncestors('');

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('reports a database failure through errorMsg, and logs it', async () => {
    queryRaw.mockRejectedValue(new Error('connection refused'));

    const res = await getNoteAncestors('retro');

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toContain('connection refused');
    expect((res as { error?: unknown }).error).toBeUndefined();
    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError.mock.calls[0]?.[0]).toContain('connection refused');
  });
});
