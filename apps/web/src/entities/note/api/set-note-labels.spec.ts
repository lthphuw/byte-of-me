/**
 * What this spec defends: the ownership gate runs BEFORE any write (a guessed
 * foreign note id must not clear that note's labels), assignment is
 * replace-not-merge, and unknown names are created.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as SetNoteLabelsModule from './set-note-labels';

let setNoteLabels: typeof SetNoteLabelsModule.setNoteLabels;

beforeAll(async () => {
  ({ setNoteLabels } = await import('./set-note-labels'));
});

const noteFindFirst = mock();
Object.defineProperty(prisma, 'note', {
  value: { findFirst: noteFindFirst },
  writable: true,
  configurable: true,
});

const labelCreateMany = mock();
const labelFindMany = mock();
Object.defineProperty(prisma, 'noteLabel', {
  value: { createMany: labelCreateMany, findMany: labelFindMany },
  writable: true,
  configurable: true,
});

const assignmentDeleteMany = mock();
const assignmentCreateMany = mock();
Object.defineProperty(prisma, 'noteOnLabel', {
  value: { deleteMany: assignmentDeleteMany, createMany: assignmentCreateMany },
  writable: true,
  configurable: true,
});

// The CALLBACK form: `setNoteLabels` does its writes inside one transaction,
// so the fake hands the callback a `tx` built from the same delegates the
// assertions read.
const transaction = mock(
  (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      noteLabel: { createMany: labelCreateMany, findMany: labelFindMany },
      noteOnLabel: {
        deleteMany: assignmentDeleteMany,
        createMany: assignmentCreateMany,
      },
    })
);
Object.defineProperty(prisma, '$transaction', {
  value: transaction,
  writable: true,
  configurable: true,
});

describe('setNoteLabels', () => {
  beforeEach(() => {
    noteFindFirst.mockReset().mockResolvedValue({ id: 'note-1' });
    labelCreateMany.mockReset().mockResolvedValue({ count: 0 });
    // Stands in for the unique index: whatever names the read asks for come
    // back, in an order deliberately unlike the caller's so the reordering the
    // action does is actually exercised.
    labelFindMany
      .mockReset()
      .mockImplementation((args: { where: { name: { in: string[] } } }) =>
        Promise.resolve(
          [...args.where.name.in].reverse().map((name) => ({
            id: `label-${name}`,
            name,
            color: null,
          }))
        )
      );
    assignmentDeleteMany.mockReset().mockResolvedValue({ count: 0 });
    assignmentCreateMany.mockReset().mockResolvedValue({ count: 0 });
    transaction.mockClear();
  });

  it('creates missing labels and returns the full set', async () => {
    const res = await setNoteLabels({
      noteId: 'note-1',
      names: ['reading', 'ml'],
    });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    // The caller's order, not the read's — the chips render in the order they
    // come back, and the fake returns them reversed.
    expect(res.data.map((label) => label.name)).toEqual(['reading', 'ml']);
    const created = labelCreateMany.mock.calls[0]?.[0]?.data as Array<{
      ownerId: string;
      name: string;
    }>;
    expect(created.every((row) => row.ownerId === 'admin-1')).toBe(true);
  });

  it('replaces the assignment set instead of merging', async () => {
    await setNoteLabels({ noteId: 'note-1', names: ['only-this'] });

    expect(assignmentDeleteMany).toHaveBeenCalledWith({
      where: { noteId: 'note-1' },
    });
    const created = assignmentCreateMany.mock.calls[0]?.[0]?.data as Array<{
      noteId: string;
      labelId: string;
    }>;
    expect(created).toEqual([
      { noteId: 'note-1', labelId: 'label-only-this' },
    ]);
  });

  it('an empty set clears every assignment and creates nothing', async () => {
    await setNoteLabels({ noteId: 'note-1', names: [] });

    expect(assignmentDeleteMany).toHaveBeenCalled();
    expect(assignmentCreateMany).not.toHaveBeenCalled();
    expect(labelCreateMany).not.toHaveBeenCalled();
  });

  it('refuses a note the caller does not own, before any write', async () => {
    noteFindFirst.mockResolvedValue(null);

    const res = await setNoteLabels({
      noteId: 'someone-elses',
      names: ['x'],
    });

    expect(res.success).toBe(false);
    expect(transaction).not.toHaveBeenCalled();
    expect(assignmentDeleteMany).not.toHaveBeenCalled();
  });

  it('dedupes repeated names before touching the unique constraint', async () => {
    const res = await setNoteLabels({
      noteId: 'note-1',
      names: ['dup', 'dup'],
    });

    const created = labelCreateMany.mock.calls[0]?.[0]?.data as unknown[];
    expect(created).toHaveLength(1);
    // And the duplicate must not reappear on the way out: the caller-order
    // remap looks each name up, so an undeduped input would return it twice.
    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data).toHaveLength(1);
  });
});
