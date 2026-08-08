/**
 * `getSharedNoteById` is the recipient's view of a document. Its contracts:
 * an inaccessible note is indistinguishable from a missing one, the read is
 * scoped to the note's OWNER rather than the caller, the payload carries no
 * label (owner-wide vocabulary) and no isPinned (an owner preference), note
 * links are served against the shared route, and only the links the caller
 * can actually reach are marked linkable — while the rest stay in the
 * document so an editor save round-trips losslessly.
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

import type * as Module from './get-shared-note-by-id';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

let getSharedNoteById: typeof Module.getSharedNoteById;

const queryRaw = mock();
const findFirst = mock();

beforeAll(async () => {
  Object.defineProperty(prisma, '$queryRaw', {
    value: queryRaw,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(prisma, 'note', {
    value: { findFirst },
    writable: true,
    configurable: true,
  });
  ({ getSharedNoteById } = await import('./get-shared-note-by-id'));
});

/** One link the caller can reach, one they cannot. */
const DOC = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'inside',
          marks: [{ type: 'link', attrs: { href: '/space/notes/inside' } }],
        },
        {
          type: 'text',
          text: 'outside',
          marks: [{ type: 'link', attrs: { href: '/space/notes/stranger' } }],
        },
      ],
    },
  ],
});

/** The resolver's row, then the reachable-subtree row. */
function grantThenSubtree() {
  queryRaw
    .mockResolvedValueOnce([
      { root_id: 'folder-a', owner_id: 'owner-1', depth: 1, role: 'VIEWER' },
    ])
    .mockResolvedValueOnce([{ id: 'inside' }]);
}

describe('getSharedNoteById', () => {
  beforeEach(() => {
    setTestUser({ id: 'user-bob', role: 'USER', email: 'bob@example.com' });
    queryRaw.mockReset();
    findFirst.mockReset().mockResolvedValue({
      id: 'note-1',
      title: 'Retro',
      content: DOC,
      parentId: 'folder-a',
      createdAt: new Date(0),
      updatedAt: new Date(0),
      status: 'draft',
      properties: null,
      isFolder: false,
    });
  });

  afterAll(resetTestUser);

  it('returns Not found when no grant sits on the path', async () => {
    queryRaw.mockResolvedValue([]);

    const res = await getSharedNoteById('note-1');

    expect(res.success).toBe(false);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('scopes the read to the note owner, not the caller', async () => {
    grantThenSubtree();

    await getSharedNoteById('note-1');

    expect(findFirst.mock.calls[0]?.[0].where.ownerId).toBe('owner-1');
  });

  it('selects neither labels nor isPinned', async () => {
    grantThenSubtree();

    await getSharedNoteById('note-1');

    const select = findFirst.mock.calls[0]?.[0].select;
    expect(select.labels).toBeUndefined();
    expect(select.isPinned).toBeUndefined();
  });

  it('serves note links against the shared route', async () => {
    grantThenSubtree();

    const res = await getSharedNoteById('note-1');

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.content).toContain('/shared/notes/inside');
    expect(res.data.content).not.toContain('/space/notes/');
  });

  it('marks only reachable links linkable, keeping the rest in the document', async () => {
    // The unreachable mark stays: an editor saves the whole document back, so
    // stripping it would delete the owner's link permanently.
    grantThenSubtree();

    const res = await getSharedNoteById('note-1');

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.linkableIds).toEqual(['inside']);
    expect(res.data.content).toContain('/shared/notes/stranger');
  });

  it('carries the role and share root through to the caller', async () => {
    grantThenSubtree();

    const res = await getSharedNoteById('note-1');

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.role).toBe('VIEWER');
    expect(res.data.rootId).toBe('folder-a');
  });
});
