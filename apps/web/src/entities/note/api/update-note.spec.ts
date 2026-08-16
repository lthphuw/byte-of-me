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
const findMany = mock();
Object.defineProperty(prisma, 'note', {
  value: { updateMany, findFirstOrThrow, findMany },
  writable: true,
  configurable: true,
});

const linkDeleteMany = mock();
const linkCreateMany = mock();
/**
 * The edges this note ALREADY has. `updateNote` reads them before deciding
 * whether to rewrite anything, so that a save which did not move a `[[` link
 * — every save made while typing prose — skips the delete/insert transaction.
 * Defaults to "none stored", which is what makes the tests below still see a
 * write for a document that introduces links.
 */
const linkFindMany = mock<
  () => Promise<{ targetId: string }[]>
>(() => Promise.resolve([]));
Object.defineProperty(prisma, 'noteLink', {
  value: {
    deleteMany: linkDeleteMany,
    createMany: linkCreateMany,
    findMany: linkFindMany,
  },
  writable: true,
  configurable: true,
});

// The array form `updateNote` uses. Awaiting the operations is enough: each
// one is already a mock's resolved promise, and what these tests assert on is
// which delegate calls were made, not that a real transaction wrapped them.
const transaction = mock((operations: Promise<unknown>[]) =>
  Promise.all(operations)
);
Object.defineProperty(prisma, '$transaction', {
  value: transaction,
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

/** A document linking to each of `noteIds`, plus one external link. */
function docLinkingTo(...noteIds: string[]): string {
  return JSON.stringify({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          ...noteIds.map((id) => ({
            type: 'text',
            text: `see ${id}`,
            marks: [{ type: 'link', attrs: { href: `/space/notes/${id}` } }],
          })),
          {
            type: 'text',
            text: 'kafka docs',
            marks: [
              { type: 'link', attrs: { href: 'https://kafka.apache.org' } },
            ],
          },
        ],
      },
    ],
  });
}

/** The `createMany` payload of the most recent save, or `[]` if none. */
function createdLinks(): { sourceId: string; targetId: string }[] {
  const call = linkCreateMany.mock.calls[0]?.[0] as
    | { data: { sourceId: string; targetId: string }[] }
    | undefined;
  return call?.data ?? [];
}

describe('updateNote', () => {
  beforeEach(() => {
    updateMany.mockReset().mockResolvedValue({ count: 1 });
    // Every id asked about comes back as owned unless a test says otherwise.
    findMany
      .mockReset()
      .mockImplementation(
        (args: { where: { id: { in: string[] } } }) =>
          Promise.resolve(args.where.id.in.map((id) => ({ id })))
      );
    linkFindMany.mockReset().mockResolvedValue([]);
    linkDeleteMany.mockReset().mockResolvedValue({ count: 0 });
    linkCreateMany.mockReset().mockResolvedValue({ count: 0 });
    transaction.mockClear();
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
      status: 'draft',
      properties: null,
      isFolder: false,
      labels: [],
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

  it('records a NoteLink row for each note the document links to', async () => {
    await updateNote({ id: 'note-1', content: docLinkingTo('note-2', 'note-3') });

    expect(createdLinks()).toEqual([
      { sourceId: 'note-1', targetId: 'note-2' },
      { sourceId: 'note-1', targetId: 'note-3' },
    ]);
  });

  it('drops a self-link rather than recording a note as its own target', async () => {
    await updateNote({ id: 'note-1', content: docLinkingTo('note-1', 'note-2') });

    expect(createdLinks()).toEqual([{ sourceId: 'note-1', targetId: 'note-2' }]);
  });

  it('drops a link to a note the caller does not own', async () => {
    // The href is author-supplied text inside a document, so a pasted id can
    // name anything. Only what the ownership query returns may be written.
    findMany.mockResolvedValue([{ id: 'note-2' }]);

    await updateNote({
      id: 'note-1',
      content: docLinkingTo('note-2', 'someone-elses-note'),
    });

    expect(createdLinks()).toEqual([{ sourceId: 'note-1', targetId: 'note-2' }]);
  });

  it('clears existing links when the document no longer has any', async () => {
    // The note DOES currently link somewhere; the new document does not. The
    // stored edges have to go, which is a real change and so a real write.
    linkFindMany.mockResolvedValue([{ targetId: 'note-2' }]);

    await updateNote({ id: 'note-1', content: tiptapDoc });

    expect(linkDeleteMany).toHaveBeenCalledWith({
      where: { sourceId: 'note-1' },
    });
    expect(linkCreateMany).not.toHaveBeenCalled();
  });

  it('writes nothing when the document links to exactly what is stored', async () => {
    // The shape of nearly every autosave: prose typed into a note whose `[[`
    // links did not move. This used to run a delete-and-reinsert transaction
    // on every pause in typing — and a note with NO links paid an
    // unconditional `deleteMany` for the same reason. One indexed read now
    // answers the question instead, and the write is skipped outright.
    linkFindMany.mockResolvedValue([
      { targetId: 'note-3' },
      { targetId: 'note-2' },
    ]);

    await updateNote({ id: 'note-1', content: docLinkingTo('note-2', 'note-3') });

    expect(linkDeleteMany).not.toHaveBeenCalled();
    expect(linkCreateMany).not.toHaveBeenCalled();
    // Order must not matter: the comparison sorts both sides, so the stored
    // rows arriving in a different order than the document lists them is not
    // a difference.
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rewrites when one link is added to an existing set', async () => {
    linkFindMany.mockResolvedValue([{ targetId: 'note-2' }]);

    await updateNote({ id: 'note-1', content: docLinkingTo('note-2', 'note-3') });

    expect(linkDeleteMany).toHaveBeenCalledWith({
      where: { sourceId: 'note-1' },
    });
    expect(createdLinks()).toEqual([
      { sourceId: 'note-1', targetId: 'note-2' },
      { sourceId: 'note-1', targetId: 'note-3' },
    ]);
  });

  it('leaves links alone when only the title changes', async () => {
    // The autosave sends title and content separately; a rename must not
    // rewrite the note's links, and certainly must not clear them.
    await updateNote({ id: 'note-1', title: 'Kafka internals' });

    expect(linkDeleteMany).not.toHaveBeenCalled();
    expect(linkCreateMany).not.toHaveBeenCalled();
  });

  it('persists status, properties and isPinned when provided', async () => {
    const res = await updateNote({
      id: 'note-1',
      status: 'active',
      properties: { mood: 'good', priority: 2, done: false },
      isPinned: true,
    });

    expect(res.success).toBe(true);
    const data = updateMany.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(data.status).toBe('active');
    expect(data.properties).toEqual({ mood: 'good', priority: 2, done: false });
    expect(data.isPinned).toBe(true);
    // No content in the input → the search index and the links are untouched.
    expect(data.plainText).toBeUndefined();
    expect(linkDeleteMany).not.toHaveBeenCalled();
  });

  it('omits status, properties and isPinned from the write when absent', async () => {
    await updateNote({ id: 'note-1', title: 'Kafka internals' });

    const data = updateMany.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect('status' in data).toBe(false);
    expect('properties' in data).toBe(false);
    expect('isPinned' in data).toBe(false);
  });

  it('rejects an oversized properties map through errorMsg', async () => {
    const properties = Object.fromEntries(
      Array.from({ length: 41 }, (_, i) => [`k${i}`, 'v'])
    );

    const res = await updateNote({ id: 'note-1', properties });

    expect(res.success).toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('does not touch links when the note belongs to someone else', async () => {
    // `updateMany` is already owner-scoped, so a miss means the note is not
    // the caller's. Without the count gate, the delete below would clear that
    // other owner's links for an id the caller merely guessed.
    updateMany.mockResolvedValue({ count: 0 });

    await updateNote({ id: 'someone-elses-note', content: docLinkingTo('note-2') });

    expect(linkDeleteMany).not.toHaveBeenCalled();
    expect(linkCreateMany).not.toHaveBeenCalled();
  });
});
