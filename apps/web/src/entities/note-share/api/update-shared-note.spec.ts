/**
 * `updateSharedNote` is the only write a non-owner can perform. Its
 * contracts: a VIEWER is refused, the write is scoped to the owner by the
 * same statement that performs it, hrefs are restored before persisting (or
 * the note's entire outgoing link set is deleted on the first save), and a
 * link target the editor cannot reach survives only if it was already there.
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

import type * as Module from './update-shared-note';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

let updateSharedNote: typeof Module.updateSharedNote;

const queryRaw = mock();
const updateMany = mock();
const findFirst = mock();
const linkFindMany = mock();
const linkDeleteMany = mock();
const linkCreateMany = mock();
const transaction = mock();

beforeAll(async () => {
  Object.defineProperty(prisma, '$queryRaw', {
    value: queryRaw,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(prisma, '$transaction', {
    value: transaction,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(prisma, 'note', {
    value: { updateMany, findFirst },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(prisma, 'noteLink', {
    value: {
      findMany: linkFindMany,
      deleteMany: linkDeleteMany,
      createMany: linkCreateMany,
    },
    writable: true,
    configurable: true,
  });
  ({ updateSharedNote } = await import('./update-shared-note'));
});

/** One link inside the shared subtree, one pointing out of it. */
const SHARED_DOC = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'x',
          marks: [{ type: 'link', attrs: { href: '/shared/notes/inside' } }],
        },
        {
          type: 'text',
          text: 'y',
          marks: [{ type: 'link', attrs: { href: '/shared/notes/stranger' } }],
        },
      ],
    },
  ],
});

const EDITOR_GRANT = [
  { root_id: 'folder-a', owner_id: 'owner-1', depth: 1, role: 'EDITOR' },
];

/** Everything `createMany` was asked to write, flattened for assertions. */
function writtenTargets(): string[] {
  return linkCreateMany.mock.calls.flatMap(
    (call) =>
      (call[0]?.data as { targetId: string }[] | undefined)?.map(
        (row) => row.targetId
      ) ?? []
  );
}

describe('updateSharedNote', () => {
  beforeEach(() => {
    setTestUser({ id: 'user-bob', role: 'USER', email: 'bob@example.com' });
    queryRaw.mockReset().mockResolvedValue(EDITOR_GRANT);
    updateMany.mockReset().mockResolvedValue({ count: 1 });
    linkFindMany.mockReset().mockResolvedValue([]);
    linkDeleteMany.mockReset().mockResolvedValue({ count: 0 });
    linkCreateMany.mockReset().mockResolvedValue({ count: 0 });
    transaction.mockReset().mockResolvedValue([]);
    findFirst.mockReset().mockResolvedValue({
      id: 'note-1',
      title: 'Retro',
      content: '{"type":"doc","content":[]}',
      parentId: 'folder-a',
      createdAt: new Date(0),
      updatedAt: new Date(0),
      status: 'draft',
      properties: null,
      isFolder: false,
    });
  });

  afterAll(resetTestUser);

  it('refuses a VIEWER', async () => {
    queryRaw.mockResolvedValue([
      { root_id: 'folder-a', owner_id: 'owner-1', depth: 1, role: 'VIEWER' },
    ]);

    const res = await updateSharedNote({ id: 'note-1', content: SHARED_DOC });

    expect(res.success).toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('refuses a caller with no grant at all', async () => {
    queryRaw.mockResolvedValue([]);

    const res = await updateSharedNote({ id: 'note-1', title: 'Renamed' });

    expect(res.success).toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('scopes the write to the owner in the same statement', async () => {
    await updateSharedNote({ id: 'note-1', title: 'Renamed' });

    expect(updateMany.mock.calls[0]?.[0].where).toEqual({
      id: 'note-1',
      ownerId: 'owner-1',
    });
  });

  it('restores owner hrefs before persisting', async () => {
    // If this regresses, parseNoteHref matches nothing and the note's whole
    // outgoing link set is deleted on the first save.
    await updateSharedNote({ id: 'note-1', content: SHARED_DOC });

    const written = updateMany.mock.calls[0]?.[0].data.content as string;
    expect(written).toContain('/space/notes/inside');
    expect(written).not.toContain('/shared/notes/');
  });

  it('does not rewrite links when only the title changed', async () => {
    // The autosave sends title and body separately; a rename must not touch
    // the link set.
    await updateSharedNote({ id: 'note-1', title: 'Renamed' });

    expect(transaction).not.toHaveBeenCalled();
    expect(linkDeleteMany).not.toHaveBeenCalled();
  });

  it('drops a link target outside the subtree that did not already exist', async () => {
    queryRaw
      .mockResolvedValueOnce(EDITOR_GRANT)
      // The subtree walk: only `inside` is reachable.
      .mockResolvedValueOnce([{ id: 'inside' }]);
    linkFindMany.mockResolvedValue([]);

    await updateSharedNote({ id: 'note-1', content: SHARED_DOC });

    expect(writtenTargets()).toEqual(['inside']);
  });

  it('keeps a pre-existing out-of-subtree target', async () => {
    queryRaw
      .mockResolvedValueOnce(EDITOR_GRANT)
      .mockResolvedValueOnce([{ id: 'inside' }]);
    // The owner already linked to it; an editor's save must not delete that.
    linkFindMany.mockResolvedValue([{ targetId: 'stranger' }]);

    await updateSharedNote({ id: 'note-1', content: SHARED_DOC });

    expect(writtenTargets()).toEqual(['inside', 'stranger']);
  });
});
