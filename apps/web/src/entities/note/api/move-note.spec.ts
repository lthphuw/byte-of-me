/**
 * Defends the one rule that turns a corrupt write into an unrenderable tree:
 * a note may never become its own ancestor. `wouldCreateCycle` is unit-tested
 * on its own in `model/note-tree.spec.ts`; this spec checks the action
 * actually consults it before writing.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as MoveNoteModule from './move-note';

let moveNote: typeof MoveNoteModule.moveNote;

beforeAll(async () => {
  ({ moveNote } = await import('./move-note'));
});

const findMany = mock();
const update = mock();
Object.defineProperty(prisma, 'note', {
  value: { findMany, update },
  writable: true,
  configurable: true,
});

describe('moveNote', () => {
  beforeEach(() => {
    // a → b → c
    findMany.mockReset().mockResolvedValue([
      { id: 'a', parentId: null },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'b' },
    ]);
    update.mockReset().mockResolvedValue({ id: 'a' });
  });

  it('refuses to re-parent a note under its own descendant', async () => {
    const res = await moveNote({ id: 'a', parentId: 'c', position: 0 });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });

  it('performs a legal move', async () => {
    const res = await moveNote({ id: 'c', parentId: null, position: 0 });

    expect(res.success).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('scopes the ancestry lookup to the calling owner', async () => {
    await moveNote({ id: 'c', parentId: null, position: 0 });

    const where = findMany.mock.calls[0]?.[0]?.where as Record<string, unknown>;
    expect(where.ownerId).toBe('admin-1');
  });
});
