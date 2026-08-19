/**
 * Archiving a parent without archiving its children leaves the children
 * reachable and their parent gone — orphans in the sidebar. The cascade is the
 * contract.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as ArchiveNoteModule from './archive-note';
import type * as RestoreNoteModule from './restore-note';

let archiveNote: typeof ArchiveNoteModule.archiveNote;
let restoreNote: typeof RestoreNoteModule.restoreNote;

beforeAll(async () => {
  ({ archiveNote } = await import('./archive-note'));
  ({ restoreNote } = await import('./restore-note'));
});

const findMany = mock();
const updateMany = mock();
Object.defineProperty(prisma, 'note', {
  value: { findMany, updateMany },
  writable: true,
  configurable: true,
});

// Top-level, not inside a `describe`: both suites below read
// `updateMany.mock.calls[0]`, so each test needs the call log cleared. Nested
// inside `describe('archiveNote')` this would leave the restore suite reading
// the last archive test's call.
beforeEach(() => {
  // a → b → c
  findMany.mockReset().mockResolvedValue([
    { id: 'a', parentId: null },
    { id: 'b', parentId: 'a' },
    { id: 'c', parentId: 'b' },
  ]);
  updateMany.mockReset().mockResolvedValue({ count: 3 });
});

describe('archiveNote', () => {
  it('archives the note together with every descendant', async () => {
    const res = await archiveNote('a');

    expect(res.success).toBe(true);
    const where = updateMany.mock.calls[0]?.[0]?.where as {
      id: { in: string[] };
    };
    expect([...where.id.in].sort()).toEqual(['a', 'b', 'c']);
  });

  // The cascade is computed here and nowhere else, so this is the only place
  // that can tell the caller which notes just left the tree. Without it the
  // editor — which may be open on a DESCENDANT rather than on the row that
  // was clicked — had no way to know it was showing an archived note, and
  // kept autosaving into one.
  it('names every id it archived, target first', async () => {
    const res = await archiveNote('a');

    if (!res.success) throw new Error('unreachable');
    expect(res.data[0]).toBe('a');
    expect([...res.data].sort()).toEqual(['a', 'b', 'c']);
  });

  it('sets archivedAt rather than deleting', async () => {
    await archiveNote('a');

    const data = updateMany.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(data.archivedAt).toBeInstanceOf(Date);
  });

  it('scopes the write to the calling owner', async () => {
    await archiveNote('a');

    const where = updateMany.mock.calls[0]?.[0]?.where as Record<string, unknown>;
    expect(where.ownerId).toBe('admin-1');
  });

  // The owner-scoped `findMany` above already tells us whether the target
  // exists for this owner, before any write happens — an id absent from
  // those rows either never existed or belongs to someone else, and the two
  // are deliberately indistinguishable in the response (AGENTS §11.5 /
  // Task 5 review: `moveNote` doesn't leak that difference either).
  it('reports failure via errorMsg when no note matches this owner', async () => {
    const res = await archiveNote('missing');

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe('restoreNote', () => {
  // Restore must cover exactly the set archive covered. If it reversed only
  // the target, a restored parent would reappear with its children still
  // archived — the same orphaning, in the other direction.
  it('clears archivedAt across the note and every descendant', async () => {
    const res = await restoreNote('a');

    expect(res.success).toBe(true);
    const call = updateMany.mock.calls[0]?.[0] as {
      where: { id: { in: string[] } };
      data: Record<string, unknown>;
    };
    expect([...call.where.id.in].sort()).toEqual(['a', 'b', 'c']);
    expect(call.data.archivedAt).toBeNull();
  });

  it('reports failure via errorMsg when no note matches this owner', async () => {
    const res = await restoreNote('missing');

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect(updateMany).not.toHaveBeenCalled();
  });
});
