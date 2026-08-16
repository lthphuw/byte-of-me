/**
 * `rebuildLinkGraph` re-derives `NoteLink` from the documents. What it defends:
 *
 * - It only ever WRITES links. The document is the input to the derivation, so
 *   a job that could also edit a `Note` row could launder an extraction bug
 *   into the source of truth.
 * - It writes nothing when the stored edges already match the document, which
 *   is the overwhelmingly common case — `updateNote` keeps them correct — and
 *   the difference between a no-op run and one that rewrites the whole corpus.
 * - The batch resolves ownership and reads existing edges in ONE query each,
 *   not one per note.
 * - Paging is a cursor on `id`, exclusive, with the `limit + 1` probe.
 *
 * The delegates are replaced wholesale rather than spied on, for the reason
 * `get-notes-page.spec.ts` records: Prisma 7 synthesizes a fresh function per
 * method access. `requireAdmin` is stubbed globally to `admin-1`.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as RebuildLinkGraphModule from './rebuild-link-graph';

let rebuildLinkGraph: typeof RebuildLinkGraphModule.rebuildLinkGraph;

beforeAll(async () => {
  ({ rebuildLinkGraph } = await import('./rebuild-link-graph'));
});

const noteCount = mock();
const noteFindMany = mock();
const noteUpdateMany = mock();
const noteUpdate = mock();
Object.defineProperty(prisma, 'note', {
  value: {
    count: noteCount,
    findMany: noteFindMany,
    updateMany: noteUpdateMany,
    update: noteUpdate,
  },
  writable: true,
  configurable: true,
});

const linkFindMany = mock();
const linkDeleteMany = mock();
const linkCreateMany = mock();
Object.defineProperty(prisma, 'noteLink', {
  value: {
    findMany: linkFindMany,
    deleteMany: linkDeleteMany,
    createMany: linkCreateMany,
  },
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

type NoteFindManyArgs = {
  where: Record<string, unknown> & { id?: { in: string[] } };
  select: Record<string, unknown>;
  orderBy?: unknown;
  take?: number;
  cursor?: { id: string };
  skip?: number;
};

/**
 * The two `note.findMany` calls this action makes are told apart by their
 * `where`: the page has no `id` filter, the ownership probe is only an `id`
 * filter. Splitting them here is what lets a test assert "one ownership query
 * per batch, whatever the page contains".
 */
const pageCalls = () =>
  noteFindMany.mock.calls
    .map((call) => call[0] as NoteFindManyArgs)
    .filter((args) => !args.where.id);

const ownershipCalls = () =>
  noteFindMany.mock.calls
    .map((call) => call[0] as NoteFindManyArgs)
    .filter((args) => Boolean(args.where.id));

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

/** Notes the page query returns. */
function page(...notes: { id: string; content: string }[]) {
  noteFindMany.mockImplementation((args: NoteFindManyArgs) =>
    args.where.id
      ? // Every id asked about is owned unless a test overrides this.
        Promise.resolve(args.where.id.in.map((id) => ({ id, title: id })))
      : Promise.resolve(notes)
  );
}

/** The `createMany` payload of the batch, or `[]` if it wrote nothing. */
function createdLinks(): { sourceId: string; targetId: string }[] {
  const call = linkCreateMany.mock.calls[0]?.[0] as
    | { data: { sourceId: string; targetId: string }[] }
    | undefined;
  return call?.data ?? [];
}

describe('rebuildLinkGraph', () => {
  beforeEach(() => {
    noteCount.mockReset().mockResolvedValue(0);
    noteFindMany.mockReset();
    noteUpdateMany.mockReset().mockResolvedValue({ count: 0 });
    noteUpdate.mockReset().mockResolvedValue({});
    linkFindMany.mockReset().mockResolvedValue([]);
    linkDeleteMany.mockReset().mockResolvedValue({ count: 0 });
    linkCreateMany.mockReset().mockResolvedValue({ count: 0 });
    transaction.mockClear();
    page({ id: 'note-1', content: docLinkingTo('note-2') });
  });

  it('pages over the caller’s own documents, never folders', async () => {
    await rebuildLinkGraph({});

    expect(pageCalls()[0]?.where.ownerId).toBe('admin-1');
    // A folder has no document, so it has no links to derive; counting one
    // would only make the progress bar lie about how much work there is.
    expect(pageCalls()[0]?.where.isFolder).toBe(false);
  });

  it('includes archived notes in the scope', async () => {
    // The reads filter the bin out, but the rows survive archiving. Skipping
    // archived notes would leave exactly the ones nobody looks at as the ones
    // whose links can never be repaired — and restoring one would put its
    // stale edges straight back into the graph.
    await rebuildLinkGraph({});

    expect('archivedAt' in (pageCalls()[0]?.where ?? {})).toBe(false);
  });

  it('reports a total counted over the same scope it pages', async () => {
    noteCount.mockResolvedValue(210);

    const res = await rebuildLinkGraph({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.total).toBe(210);
    expect(noteCount.mock.calls[0]?.[0]).toEqual({
      where: { ownerId: 'admin-1', isFolder: false },
    });
  });

  it('orders by id ascending and probes one row past the page', async () => {
    await rebuildLinkGraph({ limit: 10 });

    // `updatedAt` would reorder the corpus behind the cursor every time this
    // job wrote a row; a primary key cannot tie and cannot move.
    expect(pageCalls()[0]?.orderBy).toEqual({ id: 'asc' });
    expect(pageCalls()[0]?.take).toBe(11);
  });

  it('passes the cursor to Prisma exclusively, and omits it on the first call', async () => {
    await rebuildLinkGraph({ cursor: 'note-9' });
    expect(pageCalls()[0]?.cursor).toEqual({ id: 'note-9' });
    expect(pageCalls()[0]?.skip).toBe(1);

    noteFindMany.mockClear();
    await rebuildLinkGraph({ cursor: null });
    expect(pageCalls()[0]?.cursor).toBeUndefined();
    expect(pageCalls()[0]?.skip).toBeUndefined();
  });

  it('clamps the page size instead of failing the job', async () => {
    await rebuildLinkGraph({ limit: 100000 });
    expect(pageCalls()[0]?.take).toBe(101);

    noteFindMany.mockClear();
    await rebuildLinkGraph({ limit: 0 });
    expect(pageCalls()[0]?.take).toBe(26);

    noteFindMany.mockClear();
    // `Infinity` passes `z.number()` — only `.finite()` would reject it — so
    // the clamp is the last thing standing between it and a `take` Prisma
    // cannot use.
    await rebuildLinkGraph({ limit: Number.POSITIVE_INFINITY });
    expect(pageCalls()[0]?.take).toBe(26);
  });

  it('rejects a cursor that has lost its place rather than restarting silently', async () => {
    const res = await rebuildLinkGraph({ cursor: '' });

    expect(res.success).toBe(false);
    expect(noteFindMany).not.toHaveBeenCalled();
  });

  it('reports the last id of a full page as the next cursor', async () => {
    page(
      { id: 'note-1', content: docLinkingTo('note-2') },
      { id: 'note-2', content: docLinkingTo('note-2') },
      { id: 'note-3', content: docLinkingTo('note-2') }
    );

    const res = await rebuildLinkGraph({ limit: 2 });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    // The probe row is work for the NEXT call, so it must not be counted as
    // processed here — a progress bar that adds up past `total` is worse than
    // no bar.
    expect(res.data.processed).toBe(2);
    expect(res.data.nextCursor).toBe('note-2');
  });

  it('reports a null cursor when the corpus is exhausted', async () => {
    page({ id: 'note-1', content: docLinkingTo('note-2') });

    const res = await rebuildLinkGraph({ limit: 5 });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.processed).toBe(1);
    expect(res.data.nextCursor).toBeNull();
  });

  it('handles an empty page without querying links or writing', async () => {
    page();

    const res = await rebuildLinkGraph({ cursor: 'note-9' });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data).toMatchObject({ processed: 0, changed: 0, nextCursor: null });
    expect(linkFindMany).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('writes nothing when every stored edge already matches its document', async () => {
    // The state of a healthy vault: `updateNote` has kept these rows correct
    // on every save. A job that deleted and reinserted them to discover that
    // would take locks and write WAL for the entire corpus to change nothing.
    page(
      { id: 'note-1', content: docLinkingTo('note-2', 'note-3') },
      { id: 'note-2', content: docLinkingTo('note-3') }
    );
    linkFindMany.mockResolvedValue([
      // Deliberately not in the order the documents list them: the comparison
      // sorts both sides, so arrival order is not a difference.
      { sourceId: 'note-1', targetId: 'note-3' },
      { sourceId: 'note-1', targetId: 'note-2' },
      { sourceId: 'note-2', targetId: 'note-3' },
    ]);

    const res = await rebuildLinkGraph({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.changed).toBe(0);
    expect(transaction).not.toHaveBeenCalled();
    expect(linkDeleteMany).not.toHaveBeenCalled();
    expect(linkCreateMany).not.toHaveBeenCalled();
  });

  it('rewrites a source whose stored edges have drifted from its document', async () => {
    page({ id: 'note-1', content: docLinkingTo('note-2', 'note-3') });
    linkFindMany.mockResolvedValue([{ sourceId: 'note-1', targetId: 'note-2' }]);

    const res = await rebuildLinkGraph({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.changed).toBe(1);
    expect(linkDeleteMany).toHaveBeenCalledWith({
      where: { sourceId: { in: ['note-1'] } },
    });
    expect(createdLinks()).toEqual([
      { sourceId: 'note-1', targetId: 'note-2' },
      { sourceId: 'note-1', targetId: 'note-3' },
    ]);
  });

  it('clears the rows of a note whose document no longer links anywhere', async () => {
    page({ id: 'note-1', content: '{"type":"doc","content":[]}' });
    linkFindMany.mockResolvedValue([{ sourceId: 'note-1', targetId: 'note-2' }]);

    const res = await rebuildLinkGraph({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.changed).toBe(1);
    expect(linkDeleteMany).toHaveBeenCalledWith({
      where: { sourceId: { in: ['note-1'] } },
    });
    expect(linkCreateMany).not.toHaveBeenCalled();
  });

  it('touches only the sources that actually drifted', async () => {
    page(
      { id: 'note-1', content: docLinkingTo('note-2') },
      { id: 'note-2', content: docLinkingTo('note-3') }
    );
    // `note-1` is already correct; only `note-2` is not.
    linkFindMany.mockResolvedValue([{ sourceId: 'note-1', targetId: 'note-2' }]);

    const res = await rebuildLinkGraph({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.changed).toBe(1);
    expect(linkDeleteMany).toHaveBeenCalledWith({
      where: { sourceId: { in: ['note-2'] } },
    });
    expect(createdLinks()).toEqual([
      { sourceId: 'note-2', targetId: 'note-3' },
    ]);
  });

  it('drops a self-link rather than recording a note as its own target', async () => {
    page({ id: 'note-1', content: docLinkingTo('note-1', 'note-2') });

    await rebuildLinkGraph({});

    expect(createdLinks()).toEqual([{ sourceId: 'note-1', targetId: 'note-2' }]);
  });

  it('drops a link to a note the caller does not own', async () => {
    // The href is author-supplied text inside a document, so a pasted id can
    // name anything. Only what the ownership query returns may be written.
    noteFindMany.mockImplementation((args: NoteFindManyArgs) =>
      args.where.id
        ? Promise.resolve([{ id: 'note-2' }])
        : Promise.resolve([
            { id: 'note-1', content: docLinkingTo('note-2', 'someone-elses') },
          ])
    );

    await rebuildLinkGraph({});

    expect(ownershipCalls()[0]?.where.ownerId).toBe('admin-1');
    expect(createdLinks()).toEqual([{ sourceId: 'note-1', targetId: 'note-2' }]);
  });

  it('resolves ownership for the whole batch in one query', async () => {
    page(
      { id: 'note-1', content: docLinkingTo('note-2') },
      { id: 'note-2', content: docLinkingTo('note-3') },
      { id: 'note-3', content: docLinkingTo('note-4') }
    );

    await rebuildLinkGraph({});

    // One query per note would be a round trip per link on a densely linked
    // vault, for a question a single `in` clause answers.
    expect(ownershipCalls()).toHaveLength(1);
    expect(ownershipCalls()[0]?.where.id?.in.sort()).toEqual([
      'note-2',
      'note-3',
      'note-4',
    ]);
    expect(linkFindMany.mock.calls).toHaveLength(1);
  });

  it('reads existing edges for the whole batch in one query', async () => {
    page(
      { id: 'note-1', content: docLinkingTo('note-2') },
      { id: 'note-2', content: docLinkingTo('note-3') }
    );

    await rebuildLinkGraph({});

    expect(linkFindMany.mock.calls[0]?.[0]).toEqual({
      where: { sourceId: { in: ['note-1', 'note-2'] } },
      select: { sourceId: true, targetId: true },
    });
  });

  it('never writes a Note row', async () => {
    page({ id: 'note-1', content: docLinkingTo('note-2') });
    linkFindMany.mockResolvedValue([{ sourceId: 'note-1', targetId: 'note-9' }]);

    await rebuildLinkGraph({});

    // The document is the INPUT to this derivation. A job able to edit it
    // could make the graph "right" by making the note wrong, and there would
    // be nothing left to recompute from.
    expect(noteUpdateMany).not.toHaveBeenCalled();
    expect(noteUpdate).not.toHaveBeenCalled();
    expect(pageCalls()[0]?.select.content).toBe(true);
    expect(pageCalls()[0]?.select.plainText).toBeUndefined();
  });

  it('reports failure through errorMsg, never error', async () => {
    noteFindMany.mockRejectedValue(new Error('connection refused'));

    const res = await rebuildLinkGraph({});

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect((res as { error?: unknown }).error).toBeUndefined();
  });
});
