/**
 * `getNoteGroupSummaries` gives the grouped view its section headers without
 * loading a single row. What this defends:
 *
 * - The count is the TRUE bucket size, read from an aggregate. That is the
 *   entire reason it is a separate query from the rows: a header that counted
 *   the loaded page would say "3" under a section holding 300, and would
 *   change every time the reader scrolled.
 * - The label branch counts THROUGH the `NoteOnLabel` join, so a note wearing
 *   two labels counts once in each bucket — the semantics `groupRows` had
 *   client-side, preserved.
 * - Unlabeled notes are their own bucket, counted as notes with no join rows.
 * - Folders and archived notes never reach a count, so a header can never
 *   promise rows the row query will not return.
 *
 * The delegates are replaced wholesale rather than spied on, for the reason
 * `get-note-tree.spec.ts` records: Prisma 7 synthesizes a fresh function per
 * method access. `requireAdmin` is stubbed globally to `admin-1`.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as GetNoteGroupSummariesModule from './get-note-group-summaries';

let getNoteGroupSummaries: typeof GetNoteGroupSummariesModule.getNoteGroupSummaries;

beforeAll(async () => {
  ({ getNoteGroupSummaries } = await import('./get-note-group-summaries'));
});

const groupBy = mock();
const count = mock();
const labelFindMany = mock();

Object.defineProperty(prisma, 'note', {
  value: { groupBy, count },
  writable: true,
  configurable: true,
});
Object.defineProperty(prisma, 'noteLabel', {
  value: { findMany: labelFindMany },
  writable: true,
  configurable: true,
});

type Args = {
  by?: unknown;
  where: Record<string, unknown>;
  select?: Record<string, unknown>;
  orderBy?: unknown;
  _count?: unknown;
};

const groupByArgs = () => groupBy.mock.calls[0]?.[0] as Args;
const countArgs = () => count.mock.calls[0]?.[0] as Args;
const labelArgs = () => labelFindMany.mock.calls[0]?.[0] as Args;

/** The note filter the label branch applies through the join. */
const joinNoteWhere = () => {
  const select = labelArgs().select as {
    _count: { select: { notes: { where: { note: Record<string, unknown> } } } };
  };
  return select._count.select.notes.where.note;
};

describe('getNoteGroupSummaries', () => {
  beforeEach(() => {
    groupBy.mockReset().mockResolvedValue([]);
    count.mockReset().mockResolvedValue(0);
    labelFindMany.mockReset().mockResolvedValue([]);
  });

  describe('grouped by status', () => {
    it('aggregates owner-scoped documents only', async () => {
      await getNoteGroupSummaries({ groupBy: 'status' });

      expect(groupByArgs().by).toEqual(['status']);
      expect(groupByArgs().where.ownerId).toBe('admin-1');
      // Folders are containers, not notes; the grouped view lists documents.
      expect(groupByArgs().where.isFolder).toBe(false);
      expect(groupByArgs().where.archivedAt).toBeNull();
    });

    it('includes archived notes only when asked', async () => {
      await getNoteGroupSummaries({ groupBy: 'status', includeArchived: true });

      expect(groupByArgs().where.archivedAt).toBeUndefined();
    });

    it('reports the TRUE bucket size from the aggregate', async () => {
      groupBy.mockResolvedValue([
        { status: 'active', _count: { _all: 312 } },
        { status: 'draft', _count: { _all: 7 } },
      ]);

      const res = await getNoteGroupSummaries({ groupBy: 'status' });

      expect(res.success).toBe(true);
      if (!res.success) throw new Error('unreachable');
      // 312 is the point of this action: the rows query will hand back a page
      // of 100, and a header reading "100" would be a lie that changes as the
      // reader scrolls.
      expect(res.data).toEqual([
        { key: 'status:active', title: 'active', count: 312 },
        { key: 'status:draft', title: 'draft', count: 7 },
      ]);
    });

    it('keys a status bucket so the rows query can parse it back', async () => {
      groupBy.mockResolvedValue([
        { status: 'in progress', _count: { _all: 2 } },
      ]);

      const res = await getNoteGroupSummaries({ groupBy: 'status' });

      expect(res.success).toBe(true);
      if (!res.success) throw new Error('unreachable');
      // A status is free-form author vocabulary and may contain anything; the
      // prefix is what tells `getNotesInGroup` where the value starts.
      expect(res.data[0]?.key).toBe('status:in progress');
      expect(res.data[0]?.labelId).toBeUndefined();
    });

    it('does not touch the label tables', async () => {
      await getNoteGroupSummaries({ groupBy: 'status' });

      expect(labelFindMany).not.toHaveBeenCalled();
      expect(count).not.toHaveBeenCalled();
    });
  });

  describe('grouped by label', () => {
    it('counts through the join, filtered to the owner live documents', async () => {
      await getNoteGroupSummaries({ groupBy: 'label' });

      expect(labelArgs().where.ownerId).toBe('admin-1');
      expect(joinNoteWhere().ownerId).toBe('admin-1');
      expect(joinNoteWhere().isFolder).toBe(false);
      expect(joinNoteWhere().archivedAt).toBeNull();
    });

    it('never selects the note documents', async () => {
      await getNoteGroupSummaries({ groupBy: 'label' });

      expect(labelArgs().select?.content).toBeUndefined();
      expect(labelArgs().select?.plainText).toBeUndefined();
      expect(labelArgs().select?.name).toBe(true);
    });

    it('returns one bucket per label, carrying the id drops need', async () => {
      labelFindMany.mockResolvedValue([
        { id: 'l1', name: 'Ideas', _count: { notes: 41 } },
        { id: 'l2', name: 'Work', _count: { notes: 5 } },
      ]);

      const res = await getNoteGroupSummaries({ groupBy: 'label' });

      expect(res.success).toBe(true);
      if (!res.success) throw new Error('unreachable');
      expect(res.data.slice(0, 2)).toEqual([
        { key: 'label:l1', title: 'Ideas', labelId: 'l1', count: 41 },
        { key: 'label:l2', title: 'Work', labelId: 'l2', count: 5 },
      ]);
    });

    it('omits a label nothing is filed under', async () => {
      labelFindMany.mockResolvedValue([
        { id: 'l1', name: 'Ideas', _count: { notes: 0 } },
        { id: 'l2', name: 'Work', _count: { notes: 3 } },
      ]);

      const res = await getNoteGroupSummaries({ groupBy: 'label' });

      expect(res.success).toBe(true);
      if (!res.success) throw new Error('unreachable');
      // An empty section header is noise, and matches what `groupRows` did:
      // only labels that HAVE rows become groups.
      expect(res.data.map((group) => group.key)).toEqual(['label:l2']);
    });

    it('counts unlabeled notes as notes with no join rows, in a final bucket', async () => {
      labelFindMany.mockResolvedValue([
        { id: 'l1', name: 'Ideas', _count: { notes: 4 } },
      ]);
      count.mockResolvedValue(9);

      const res = await getNoteGroupSummaries({ groupBy: 'label' });

      expect(res.success).toBe(true);
      if (!res.success) throw new Error('unreachable');
      expect(countArgs().where.labels).toEqual({ none: {} });
      expect(countArgs().where.ownerId).toBe('admin-1');
      expect(countArgs().where.isFolder).toBe(false);
      expect(countArgs().where.archivedAt).toBeNull();
      // Last, after every named label — the "everything else" bucket. Its
      // title is the key token, not English prose: this layer is i18n-free
      // and the caller swaps it for a translated string.
      expect(res.data[res.data.length - 1]).toEqual({
        key: 'no-label',
        title: 'no-label',
        count: 9,
      });
    });

    it('omits the unlabeled bucket when every note is filed', async () => {
      labelFindMany.mockResolvedValue([
        { id: 'l1', name: 'Ideas', _count: { notes: 4 } },
      ]);
      count.mockResolvedValue(0);

      const res = await getNoteGroupSummaries({ groupBy: 'label' });

      expect(res.success).toBe(true);
      if (!res.success) throw new Error('unreachable');
      expect(res.data.map((group) => group.key)).toEqual(['label:l1']);
    });

    it('does not run the status aggregate', async () => {
      await getNoteGroupSummaries({ groupBy: 'label' });

      expect(groupBy).not.toHaveBeenCalled();
    });
  });

  it('reports failure through errorMsg, never error', async () => {
    groupBy.mockRejectedValue(new Error('connection refused'));

    const res = await getNoteGroupSummaries({ groupBy: 'status' });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect((res as { error?: unknown }).error).toBeUndefined();
  });
});
