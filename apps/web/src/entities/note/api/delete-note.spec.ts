/**
 * `deleteNote` is a hard delete relying on the database cascade — there is no
 * descendant walk to inspect here, unlike archive/restore. The one contract
 * worth defending is that a miss (no row matched this owner's id) surfaces as
 * failure rather than a silent no-op success, matching the convention
 * `update-note.ts` (`findFirstOrThrow`) and `move-note.ts` (`update`, which
 * throws `P2025`) already established.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as DeleteNoteModule from './delete-note';

let deleteNote: typeof DeleteNoteModule.deleteNote;

beforeAll(async () => {
  ({ deleteNote } = await import('./delete-note'));
});

const deleteMany = mock();
Object.defineProperty(prisma, 'note', {
  value: { deleteMany },
  writable: true,
  configurable: true,
});

describe('deleteNote', () => {
  beforeEach(() => {
    deleteMany.mockReset().mockResolvedValue({ count: 1 });
  });

  it('scopes the delete to the calling owner', async () => {
    await deleteNote('note-1');

    const where = deleteMany.mock.calls[0]?.[0]?.where as Record<
      string,
      unknown
    >;
    expect(where.id).toBe('note-1');
    expect(where.ownerId).toBe('admin-1');
  });

  // An id absent from this owner's rows and an id owned by someone else look
  // identical from here — `deleteMany`'s `where` already filters by
  // `ownerId`, so a count of zero is the only signal available, and it
  // deliberately does not say which case occurred (Task 5 review: `moveNote`
  // doesn't leak that difference either).
  it('reports failure via errorMsg when no note matches this owner', async () => {
    deleteMany.mockResolvedValue({ count: 0 });

    const res = await deleteNote('missing');

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
  });
});
