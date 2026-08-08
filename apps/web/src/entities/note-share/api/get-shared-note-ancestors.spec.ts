/**
 * The breadcrumb on the shared surface must stop at the share root. One rung
 * further would name a folder the recipient was never given — an owner who
 * shares `Work / Q3 / Retro` said nothing about what else lives under `Work`.
 *
 * The bound itself lives in SQL, so what is checked here is what a caller can
 * observe: that the root id reaches the query, that the chain comes back
 * root-first and camelCased, and that no grant means Not found.
 */
import { prisma } from '@byte-of-me/db';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from 'bun:test';

import type * as Module from './get-shared-note-ancestors';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

let getSharedNoteAncestors: typeof Module.getSharedNoteAncestors;

const queryRaw = mock();

beforeAll(async () => {
  Object.defineProperty(prisma, '$queryRaw', {
    value: queryRaw,
    writable: true,
    configurable: true,
  });
  ({ getSharedNoteAncestors } = await import('./get-shared-note-ancestors'));
});

describe('getSharedNoteAncestors', () => {
  beforeEach(() => {
    setTestUser({ id: 'user-bob', role: 'USER', email: 'bob@example.com' });
    queryRaw.mockReset();
  });

  afterAll(resetTestUser);

  it('returns the chain root first and camelCased', async () => {
    queryRaw
      .mockResolvedValueOnce([
        { root_id: 'folder-a', owner_id: 'owner-1', depth: 2, role: 'VIEWER' },
      ])
      .mockResolvedValueOnce([
        { id: 'folder-a', title: 'Project', is_folder: true },
        { id: 'folder-b', title: 'Sprints', is_folder: true },
      ]);

    const res = await getSharedNoteAncestors('note-deep');

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data).toEqual([
      { id: 'folder-a', title: 'Project', isFolder: true },
      { id: 'folder-b', title: 'Sprints', isFolder: true },
    ]);
  });

  it('bounds the walk with the share root, not just the note', async () => {
    // The root id is what stops the climb; without it in the query the chain
    // would keep going and name folders above the share.
    queryRaw
      .mockResolvedValueOnce([
        { root_id: 'folder-a', owner_id: 'owner-1', depth: 2, role: 'VIEWER' },
      ])
      .mockResolvedValueOnce([]);

    await getSharedNoteAncestors('note-deep');

    const walkValues = queryRaw.mock.calls[1]?.slice(1);
    expect(walkValues).toContain('folder-a');
    expect(walkValues).toContain('owner-1');
  });

  it('returns Not found for a note with no grant', async () => {
    queryRaw.mockResolvedValueOnce([]);

    const res = await getSharedNoteAncestors('note-deep');

    expect(res.success).toBe(false);
  });
});
