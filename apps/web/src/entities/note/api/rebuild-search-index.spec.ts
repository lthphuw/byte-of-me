/**
 * `rebuildSearchIndex` re-derives `Note.plainText` from `Note.content`. What it
 * defends:
 *
 * - The derivation is `richTextToPlainText`, the same one `updateNote` uses on
 *   the way in — the whole point of the job is that a change to that function
 *   does nothing for rows already stored.
 * - A note whose text has not drifted is NOT written. `updatedAt` is
 *   `@updatedAt`, and the explorer's default order is "recently updated": an
 *   unconditional rewrite would stamp the whole vault within seconds of itself
 *   and destroy that ordering permanently.
 * - `searchVector` is never named in a write. It is generated in SQL from
 *   `title` and `plain_text`; Prisma must never write it.
 *
 * The delegates are replaced wholesale rather than spied on, for the reason
 * `get-notes-page.spec.ts` records. `requireAdmin` is stubbed to `admin-1`.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as RebuildSearchIndexModule from './rebuild-search-index';

let rebuildSearchIndex: typeof RebuildSearchIndexModule.rebuildSearchIndex;

beforeAll(async () => {
  ({ rebuildSearchIndex } = await import('./rebuild-search-index'));
});

const noteCount = mock();
const noteFindMany = mock();
const noteUpdateMany = mock();
Object.defineProperty(prisma, 'note', {
  value: {
    count: noteCount,
    findMany: noteFindMany,
    updateMany: noteUpdateMany,
  },
  writable: true,
  configurable: true,
});

const linkDeleteMany = mock();
const linkCreateMany = mock();
Object.defineProperty(prisma, 'noteLink', {
  value: { deleteMany: linkDeleteMany, createMany: linkCreateMany },
  writable: true,
  configurable: true,
});

const transaction = mock((operations: Promise<unknown>[]) =>
  Promise.all(operations)
);
Object.defineProperty(prisma, '$transaction', {
  value: transaction,
  writable: true,
  configurable: true,
});

const pageArgs = (call = 0) =>
  noteFindMany.mock.calls[call]?.[0] as {
    where: Record<string, unknown>;
    select: Record<string, unknown>;
    orderBy?: unknown;
    take?: number;
    cursor?: { id: string };
    skip?: number;
  };

/** Every `updateMany` this run issued, in order. */
const writes = () =>
  noteUpdateMany.mock.calls.map(
    (call) =>
      call[0] as {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }
  );

/** A document whose text is `words`. */
function docSaying(...blocks: string[]): string {
  return JSON.stringify({
    type: 'doc',
    content: blocks.map((text) => ({
      type: 'paragraph',
      content: [{ type: 'text', text }],
    })),
  });
}

function page(
  ...notes: { id: string; content: string; plainText: string }[]
) {
  noteFindMany.mockResolvedValue(notes);
}

describe('rebuildSearchIndex', () => {
  beforeEach(() => {
    noteCount.mockReset().mockResolvedValue(0);
    noteFindMany.mockReset();
    noteUpdateMany.mockReset().mockResolvedValue({ count: 1 });
    linkDeleteMany.mockReset();
    linkCreateMany.mockReset();
    transaction.mockClear();
    page({
      id: 'note-1',
      content: docSaying('kafka consumer rebalance'),
      plainText: 'kafka consumer rebalance',
    });
  });

  it('pages over the caller’s own documents, never folders', async () => {
    await rebuildSearchIndex({});

    expect(pageArgs().where.ownerId).toBe('admin-1');
    expect(pageArgs().where.isFolder).toBe(false);
  });

  it('includes archived notes, which search can still be asked for', async () => {
    await rebuildSearchIndex({});

    expect('archivedAt' in pageArgs().where).toBe(false);
  });

  it('reports a total counted over the same scope it pages', async () => {
    noteCount.mockResolvedValue(88);

    const res = await rebuildSearchIndex({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.total).toBe(88);
    expect(noteCount.mock.calls[0]?.[0]).toEqual({
      where: { ownerId: 'admin-1', isFolder: false },
    });
  });

  it('orders by id ascending and probes one row past the page', async () => {
    await rebuildSearchIndex({ limit: 10 });

    // Paging by `updatedAt` would reorder the corpus behind the cursor on
    // every row this job wrote, and the next batch would skip whatever moved.
    expect(pageArgs().orderBy).toEqual({ id: 'asc' });
    expect(pageArgs().take).toBe(11);
  });

  it('passes the cursor to Prisma exclusively, and omits it on the first call', async () => {
    await rebuildSearchIndex({ cursor: 'note-9' });
    expect(pageArgs().cursor).toEqual({ id: 'note-9' });
    expect(pageArgs().skip).toBe(1);

    noteFindMany.mockClear();
    await rebuildSearchIndex({});
    expect(pageArgs().cursor).toBeUndefined();
    expect(pageArgs().skip).toBeUndefined();
  });

  it('clamps the page size instead of failing the job', async () => {
    await rebuildSearchIndex({ limit: 100000 });
    expect(pageArgs().take).toBe(101);

    noteFindMany.mockClear();
    await rebuildSearchIndex({ limit: -5 });
    expect(pageArgs().take).toBe(26);
  });

  it('rejects a cursor that has lost its place rather than restarting silently', async () => {
    const res = await rebuildSearchIndex({ cursor: '' });

    expect(res.success).toBe(false);
    expect(noteFindMany).not.toHaveBeenCalled();
  });

  it('rewrites plainText from the document when the stored text has drifted', async () => {
    // The real drift this exists for: joining every block with '' welded the
    // last word of one onto the first of the next (`data.Step` tokenised as a
    // single token), and 300 words in the corpus went missing from
    // `search_vector`. Fixing the function does nothing for stored rows.
    page({
      id: 'note-1',
      content: docSaying('through the data.', 'Step Size: 12'),
      plainText: 'through the data.Step Size: 12',
    });

    const res = await rebuildSearchIndex({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.changed).toBe(1);
    expect(writes()[0]?.data).toEqual({
      plainText: 'through the data. Step Size: 12',
    });
  });

  it('writes nothing when the stored text already matches the document', async () => {
    const res = await rebuildSearchIndex({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.processed).toBe(1);
    expect(res.data.changed).toBe(0);
    // Not just a saved write: `updatedAt` is `@updatedAt`, and the explorer's
    // default order is "recently updated". Rewriting unconditionally would
    // stamp the entire vault within seconds of itself.
    expect(noteUpdateMany).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('touches only the notes whose text actually drifted', async () => {
    page(
      {
        id: 'note-1',
        content: docSaying('kafka'),
        plainText: 'kafka',
      },
      {
        id: 'note-2',
        content: docSaying('rebalance'),
        plainText: 'stale text',
      }
    );

    const res = await rebuildSearchIndex({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.processed).toBe(2);
    expect(res.data.changed).toBe(1);
    expect(writes()).toHaveLength(1);
    expect(writes()[0]?.where.id).toBe('note-2');
  });

  it('scopes each write to the calling owner', async () => {
    page({ id: 'note-1', content: docSaying('kafka'), plainText: 'stale' });

    await rebuildSearchIndex({});

    // `updateMany` takes a full `where`, so ownership is enforced by the same
    // statement that writes — the reason `updateNote` uses it too.
    expect(writes()[0]?.where).toEqual({ id: 'note-1', ownerId: 'admin-1' });
  });

  it('writes plainText and nothing else', async () => {
    page({ id: 'note-1', content: docSaying('kafka'), plainText: 'stale' });

    await rebuildSearchIndex({});

    const data = writes()[0]?.data ?? {};
    expect(Object.keys(data)).toEqual(['plainText']);
    // `searchVector` is generated in SQL from title + plain_text; Prisma must
    // never write it, and it regenerates by itself on this update. `content`
    // is the INPUT to the derivation — a job able to rewrite it could make the
    // index right by making the note wrong.
    expect('searchVector' in data).toBe(false);
    expect('content' in data).toBe(false);
  });

  it('runs the batch’s writes in one transaction', async () => {
    page(
      { id: 'note-1', content: docSaying('a'), plainText: 'stale' },
      { id: 'note-2', content: docSaying('b'), plainText: 'stale' }
    );

    await rebuildSearchIndex({});

    // All-or-nothing per batch, so the cursor the client retries from still
    // means what it says after a failure partway.
    expect(transaction).toHaveBeenCalledTimes(1);
    expect((transaction.mock.calls[0]?.[0] as unknown[]).length).toBe(2);
  });

  it('reports the last id of a full page as the next cursor', async () => {
    page(
      { id: 'note-1', content: docSaying('a'), plainText: 'a' },
      { id: 'note-2', content: docSaying('b'), plainText: 'b' },
      { id: 'note-3', content: docSaying('c'), plainText: 'c' }
    );

    const res = await rebuildSearchIndex({ limit: 2 });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.processed).toBe(2);
    expect(res.data.nextCursor).toBe('note-2');
    // The probe row belongs to the next call and must not be written now.
    expect(noteUpdateMany).not.toHaveBeenCalled();
  });

  it('reports a null cursor when the corpus is exhausted', async () => {
    const res = await rebuildSearchIndex({ limit: 5 });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.nextCursor).toBeNull();
  });

  it('reports failure through errorMsg, never error', async () => {
    noteFindMany.mockRejectedValue(new Error('connection refused'));

    const res = await rebuildSearchIndex({});

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect((res as { error?: unknown }).error).toBeUndefined();
  });
});
