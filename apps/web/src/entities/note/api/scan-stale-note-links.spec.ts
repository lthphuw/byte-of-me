/**
 * `scanStaleNoteLinks` reports note-link anchors whose visible text no longer
 * matches the title of what they point at. What it defends:
 *
 * - It writes NOTHING, ever. A mismatch has two indistinguishable causes — the
 *   target was renamed, or the author deliberately wrote their own words — and
 *   an automatic sweep would rewrite real prose into titles with no undo.
 * - Titles are resolved with ONE batched query per call. One query per link is
 *   hundreds of round trips on a densely linked page.
 * - `changed` counts NOTES with something to look at, so it stays comparable
 *   with `processed` and can never exceed `total`.
 *
 * The delegates are replaced wholesale rather than spied on, for the reason
 * `get-notes-page.spec.ts` records. `requireAdmin` is stubbed to `admin-1`.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as ScanStaleNoteLinksModule from './scan-stale-note-links';

let scanStaleNoteLinks: typeof ScanStaleNoteLinksModule.scanStaleNoteLinks;

beforeAll(async () => {
  ({ scanStaleNoteLinks } = await import('./scan-stale-note-links'));
});

const noteCount = mock();
const noteFindMany = mock();
const noteUpdateMany = mock();
const noteUpdate = mock();
const noteDeleteMany = mock();
Object.defineProperty(prisma, 'note', {
  value: {
    count: noteCount,
    findMany: noteFindMany,
    updateMany: noteUpdateMany,
    update: noteUpdate,
    deleteMany: noteDeleteMany,
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

type NoteFindManyArgs = {
  where: Record<string, unknown> & { id?: { in: string[] } };
  select: Record<string, unknown>;
  orderBy?: unknown;
  take?: number;
  cursor?: { id: string };
  skip?: number;
};

/** The page query has no `id` filter; the title lookup is only an `id` filter. */
const pageCalls = () =>
  noteFindMany.mock.calls
    .map((call) => call[0] as NoteFindManyArgs)
    .filter((args) => !args.where.id);

const titleCalls = () =>
  noteFindMany.mock.calls
    .map((call) => call[0] as NoteFindManyArgs)
    .filter((args) => Boolean(args.where.id));

/** A paragraph whose runs each optionally carry a note link. */
function docLinking(
  ...runs: Array<{ text: string; to?: string }>
): string {
  return JSON.stringify({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: runs.map((run) => ({
          type: 'text',
          text: run.text,
          ...(run.to
            ? {
                marks: [
                  { type: 'link', attrs: { href: `/space/notes/${run.to}` } },
                ],
              }
            : {}),
        })),
      },
    ],
  });
}

/**
 * `notes` are the page; `titles` is what the batched title lookup resolves.
 * A target absent from `titles` stands for one that was deleted or belongs to
 * somebody else.
 */
function vault(
  notes: { id: string; title: string; content: string }[],
  titles: Record<string, string> = {}
) {
  noteFindMany.mockImplementation((args: NoteFindManyArgs) =>
    args.where.id
      ? Promise.resolve(
          args.where.id.in
            .filter((id) => id in titles)
            .map((id) => ({ id, title: titles[id] }))
        )
      : Promise.resolve(notes)
  );
}

describe('scanStaleNoteLinks', () => {
  beforeEach(() => {
    noteCount.mockReset().mockResolvedValue(0);
    noteFindMany.mockReset();
    noteUpdateMany.mockReset();
    noteUpdate.mockReset();
    noteDeleteMany.mockReset();
    linkDeleteMany.mockReset();
    linkCreateMany.mockReset();
    transaction.mockClear();
    vault([{ id: 'note-1', title: 'Source', content: docLinking() }]);
  });

  it('pages over the caller’s own documents, never folders', async () => {
    await scanStaleNoteLinks({});

    expect(pageCalls()[0]?.where.ownerId).toBe('admin-1');
    expect(pageCalls()[0]?.where.isFolder).toBe(false);
  });

  it('orders by id ascending, probes one row past the page, and clamps the limit', async () => {
    await scanStaleNoteLinks({ limit: 10 });
    expect(pageCalls()[0]?.orderBy).toEqual({ id: 'asc' });
    expect(pageCalls()[0]?.take).toBe(11);

    noteFindMany.mockClear();
    await scanStaleNoteLinks({ limit: 100000 });
    expect(pageCalls()[0]?.take).toBe(101);
  });

  it('passes the cursor to Prisma exclusively, and omits it on the first call', async () => {
    await scanStaleNoteLinks({ cursor: 'note-9' });
    expect(pageCalls()[0]?.cursor).toEqual({ id: 'note-9' });
    expect(pageCalls()[0]?.skip).toBe(1);

    noteFindMany.mockClear();
    await scanStaleNoteLinks({});
    expect(pageCalls()[0]?.cursor).toBeUndefined();
  });

  it('reports a total counted over the same scope it pages', async () => {
    noteCount.mockResolvedValue(42);

    const res = await scanStaleNoteLinks({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.total).toBe(42);
  });

  it('reports a label that no longer matches its target’s title', async () => {
    vault(
      [
        {
          id: 'note-1',
          title: 'Consumers',
          content: docLinking({ text: 'Kafka rebalancing', to: 'note-2' }),
        },
      ],
      { 'note-2': 'Consumer group rebalancing' }
    );

    const res = await scanStaleNoteLinks({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.stale).toEqual([
      {
        sourceId: 'note-1',
        sourceTitle: 'Consumers',
        targetId: 'note-2',
        targetTitle: 'Consumer group rebalancing',
        label: 'Kafka rebalancing',
      },
    ]);
    expect(res.data.changed).toBe(1);
  });

  it('reports nothing when the label still matches the title', async () => {
    vault(
      [
        {
          id: 'note-1',
          title: 'Consumers',
          content: docLinking({ text: ' Rebalancing ', to: 'note-2' }),
        },
      ],
      { 'note-2': 'Rebalancing' }
    );

    const res = await scanStaleNoteLinks({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    // Only the whitespace Tiptap can leave around a run is normalised away.
    expect(res.data.stale).toEqual([]);
    expect(res.data.changed).toBe(0);
  });

  it('treats a change of case as a real difference', async () => {
    vault(
      [
        {
          id: 'note-1',
          title: 'Consumers',
          content: docLinking({ text: 'Kafka', to: 'note-2' }),
        },
      ],
      { 'note-2': 'kafka' }
    );

    const res = await scanStaleNoteLinks({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    // Renaming "Kafka" to "kafka" IS a rename; only the author can say
    // whether the label should follow.
    expect(res.data.stale).toHaveLength(1);
  });

  it('resolves every target title in one batched query, owner-scoped', async () => {
    vault(
      [
        {
          id: 'note-1',
          title: 'One',
          content: docLinking(
            { text: 'a', to: 'note-2' },
            { text: ' and ' },
            { text: 'b', to: 'note-3' }
          ),
        },
        {
          id: 'note-2',
          title: 'Two',
          content: docLinking({ text: 'c', to: 'note-4' }),
        },
      ],
      { 'note-2': 'Two', 'note-3': 'Three', 'note-4': 'Four' }
    );

    await scanStaleNoteLinks({});

    expect(titleCalls()).toHaveLength(1);
    expect(titleCalls()[0]?.where.id?.in.sort()).toEqual([
      'note-2',
      'note-3',
      'note-4',
    ]);
    // An href is author-supplied text inside a document; reading a title back
    // without this would leak another owner's note title into the report.
    expect(titleCalls()[0]?.where.ownerId).toBe('admin-1');
  });

  it('skips a link whose target no longer resolves', async () => {
    vault(
      [
        {
          id: 'note-1',
          title: 'One',
          content: docLinking({ text: 'gone', to: 'deleted-note' }),
        },
      ],
      {}
    );

    const res = await scanStaleNoteLinks({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    // A broken link is a different problem with a different fix; there is no
    // title to compare against, and mixing the two makes one list useless for
    // both.
    expect(res.data.stale).toEqual([]);
  });

  it('ignores a self-link and an anchor with no visible text', async () => {
    vault(
      [
        {
          id: 'note-1',
          title: 'One',
          content: docLinking(
            { text: 'itself', to: 'note-1' },
            { text: '  ', to: 'note-2' }
          ),
        },
      ],
      { 'note-1': 'One', 'note-2': 'Two' }
    );

    const res = await scanStaleNoteLinks({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.stale).toEqual([]);
  });

  it('collapses an identical label repeated in the same note', async () => {
    vault(
      [
        {
          id: 'note-1',
          title: 'One',
          content: docLinking(
            { text: 'old name', to: 'note-2' },
            { text: ' … ' },
            { text: 'old name', to: 'note-2' }
          ),
        },
      ],
      { 'note-2': 'New name' }
    );

    const res = await scanStaleNoteLinks({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    // One decision to make, so one row — a report that looks longer than the
    // work it represents is a report nobody finishes.
    expect(res.data.stale).toHaveLength(1);
  });

  it('keeps two different labels for the same target as two findings', async () => {
    vault(
      [
        {
          id: 'note-1',
          title: 'One',
          content: docLinking(
            { text: 'old name', to: 'note-2' },
            { text: ' … ' },
            { text: 'as discussed earlier', to: 'note-2' }
          ),
        },
      ],
      { 'note-2': 'New name' }
    );

    const res = await scanStaleNoteLinks({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    // The second is almost certainly deliberate prose, and that is exactly why
    // this reports instead of rewriting — nothing stored can tell them apart.
    expect(res.data.stale.map((row) => row.label)).toEqual([
      'old name',
      'as discussed earlier',
    ]);
  });

  it('counts notes with something to look at, not labels', async () => {
    vault(
      [
        {
          id: 'note-1',
          title: 'One',
          content: docLinking(
            { text: 'x', to: 'note-3' },
            { text: ' ' },
            { text: 'y', to: 'note-4' }
          ),
        },
        {
          id: 'note-2',
          title: 'Two',
          content: docLinking({ text: 'Three', to: 'note-3' }),
        },
      ],
      { 'note-3': 'Three', 'note-4': 'Four' }
    );

    const res = await scanStaleNoteLinks({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.stale).toHaveLength(2);
    // Two stale labels, but both in one note — and `note-2`'s label is right.
    expect(res.data.changed).toBe(1);
    expect(res.data.processed).toBe(2);
  });

  it('never writes anything', async () => {
    vault(
      [
        {
          id: 'note-1',
          title: 'One',
          content: docLinking({ text: 'old name', to: 'note-2' }),
        },
      ],
      { 'note-2': 'New name' }
    );

    await scanStaleNoteLinks({});

    expect(noteUpdateMany).not.toHaveBeenCalled();
    expect(noteUpdate).not.toHaveBeenCalled();
    expect(noteDeleteMany).not.toHaveBeenCalled();
    expect(linkDeleteMany).not.toHaveBeenCalled();
    expect(linkCreateMany).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('reports the last id of a full page as the next cursor', async () => {
    vault([
      { id: 'note-1', title: 'One', content: docLinking() },
      { id: 'note-2', title: 'Two', content: docLinking() },
      { id: 'note-3', title: 'Three', content: docLinking() },
    ]);

    const res = await scanStaleNoteLinks({ limit: 2 });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.processed).toBe(2);
    expect(res.data.nextCursor).toBe('note-2');
  });

  it('handles an empty page without looking up titles', async () => {
    vault([]);

    const res = await scanStaleNoteLinks({ cursor: 'note-9' });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data).toMatchObject({
      processed: 0,
      changed: 0,
      nextCursor: null,
      stale: [],
    });
    expect(titleCalls()).toHaveLength(0);
  });

  it('reports failure through errorMsg, never error', async () => {
    noteFindMany.mockRejectedValue(new Error('connection refused'));

    const res = await scanStaleNoteLinks({});

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect((res as { error?: unknown }).error).toBeUndefined();
  });
});
