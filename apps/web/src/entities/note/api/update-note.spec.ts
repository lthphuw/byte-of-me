/**
 * `plainText` is what search reads. It is derived from `content` on the server
 * so the two can never disagree, and so a caller cannot poison the search index
 * with text the document does not contain. That derivation is the contract here.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as UpdateNoteModule from './update-note';

let updateNote: typeof UpdateNoteModule.updateNote;

beforeAll(async () => {
  ({ updateNote } = await import('./update-note'));
});

const updateMany = mock();
const findFirstOrThrow = mock();
Object.defineProperty(prisma, 'note', {
  value: { updateMany, findFirstOrThrow },
  writable: true,
  configurable: true,
});

const tiptapDoc = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'kafka consumer rebalance' }],
    },
  ],
});

describe('updateNote', () => {
  beforeEach(() => {
    updateMany.mockReset().mockResolvedValue({ count: 1 });
    findFirstOrThrow.mockReset().mockResolvedValue({
      id: 'note-1',
      title: 'Kafka',
      content: tiptapDoc,
      parentId: null,
      position: 0,
      isPinned: false,
      archivedAt: null,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    });
  });

  it('derives plainText from the submitted document', async () => {
    await updateNote({ id: 'note-1', content: tiptapDoc });

    const data = updateMany.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(data.plainText).toBe('kafka consumer rebalance');
  });

  it('scopes the write to the calling owner', async () => {
    await updateNote({ id: 'note-1', content: tiptapDoc });

    const where = updateMany.mock.calls[0]?.[0]?.where as Record<string, unknown>;
    expect(where.ownerId).toBe('admin-1');
    expect(where.id).toBe('note-1');
  });

  it('does not touch content or plainText when only the title changes', async () => {
    await updateNote({ id: 'note-1', title: 'Kafka internals' });

    const data = updateMany.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(data.title).toBe('Kafka internals');
    expect(data.content).toBeUndefined();
    expect(data.plainText).toBeUndefined();
  });

  it('rejects an empty id through errorMsg instead of querying', async () => {
    const res = await updateNote({ id: '', content: tiptapDoc });

    expect(res.success).toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
  });
});
