/**
 * Renaming a note leaves every inbound link reading the old name, because an
 * anchor's text is a snapshot of the target's title at insert time. This
 * action fixes that, and it does it by writing into OTHER notes' documents —
 * which is what makes its restraint the contract worth defending: it must
 * write only where the label was the old title verbatim, must re-derive the
 * search index it invalidates by doing so, must scope every write to the
 * caller, and must leave the link graph completely alone.
 */
import { prisma } from '@byte-of-me/db';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from 'bun:test';

import type * as RelabelModule from './relabel-inbound-note-links';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

let relabelInboundNoteLinks: typeof RelabelModule.relabelInboundNoteLinks;

beforeAll(async () => {
  ({ relabelInboundNoteLinks } = await import('./relabel-inbound-note-links'));
});

const updateMany = mock();
Object.defineProperty(prisma, 'note', {
  value: { updateMany },
  writable: true,
  configurable: true,
});

/**
 * `deleteMany` and `createMany` are stubbed although this action must never
 * call them — that is precisely why. Leaving them off the delegate would make
 * an accidental link rebuild fail with "not a function", which reads like a
 * harness gap; present and asserted-against, it reads as the contract
 * violation it is.
 */
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

// The array form the action uses. Awaiting the operations is enough: each is
// already a mock's resolved promise, and what these tests assert on is which
// delegate calls were made, not that a real transaction wrapped them.
const transaction = mock((operations: Promise<unknown>[]) =>
  Promise.all(operations)
);
Object.defineProperty(prisma, '$transaction', {
  value: transaction,
  writable: true,
  configurable: true,
});

/** A note body whose only link points at `note-1` under the given label. */
function docLabelled(label: string): string {
  return JSON.stringify({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'see ' },
          {
            type: 'text',
            text: label,
            marks: [{ type: 'link', attrs: { href: '/space/notes/note-1' } }],
          },
        ],
      },
    ],
  });
}

/** What `findMany` returns: the source id + body of each inbound link. */
function inbound(...sources: { id: string; content: string }[]) {
  return sources.map((source) => ({ source }));
}

/** The ids passed to `note.updateMany`, in call order. */
function writtenIds(): unknown[] {
  return updateMany.mock.calls.map(
    (call) => (call[0] as { where: { id: unknown } }).where.id
  );
}

const RENAME = {
  noteId: 'note-1',
  previousTitle: 'Kafka',
  nextTitle: 'Kafka internals',
};

describe('relabelInboundNoteLinks', () => {
  beforeEach(() => {
    updateMany.mockReset().mockResolvedValue({ count: 1 });
    linkFindMany.mockReset().mockResolvedValue([]);
    linkDeleteMany.mockReset().mockResolvedValue({ count: 0 });
    linkCreateMany.mockReset().mockResolvedValue({ count: 0 });
    transaction.mockClear();
  });

  afterAll(resetTestUser);

  it('rewrites only the sources whose label was the old title verbatim', async () => {
    linkFindMany.mockResolvedValue(
      inbound(
        { id: 'src-exact', content: docLabelled('Kafka') },
        { id: 'src-custom', content: docLabelled('xem bài trước') },
        { id: 'src-cased', content: docLabelled('kafka') }
      )
    );

    const res = await relabelInboundNoteLinks(RENAME);

    expect(res.success).toBe(true);
    expect(res.data).toEqual({ notes: 1, links: 1 });
    expect(writtenIds()).toEqual(['src-exact']);
  });

  it('re-derives plainText from the rewritten document', async () => {
    // `plainText` is what search reads. The anchor text just changed, so a
    // note left indexing the old title would keep answering searches for a
    // name that is no longer anywhere in it.
    linkFindMany.mockResolvedValue(
      inbound({ id: 'src-exact', content: docLabelled('Kafka') })
    );

    await relabelInboundNoteLinks(RENAME);

    const data = updateMany.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(data.plainText).toBe('see Kafka internals');
    expect(JSON.parse(String(data.content))).toEqual(
      JSON.parse(docLabelled('Kafka internals'))
    );
  });

  it('scopes both the read and every write to the calling owner', async () => {
    linkFindMany.mockResolvedValue(
      inbound({ id: 'src-exact', content: docLabelled('Kafka') })
    );

    await relabelInboundNoteLinks(RENAME);

    const where = linkFindMany.mock.calls[0]?.[0]?.where as {
      targetId: string;
      source: { ownerId: string };
    };
    expect(where.targetId).toBe('note-1');
    expect(where.source.ownerId).toBe('admin-1');

    // The write must not lean on a check made in an earlier round trip.
    const writeWhere = updateMany.mock.calls[0]?.[0]?.where as Record<
      string,
      unknown
    >;
    expect(writeWhere.ownerId).toBe('admin-1');
    expect(writeWhere.id).toBe('src-exact');
  });

  it('writes nothing on a dry run but reports what it would write', async () => {
    linkFindMany.mockResolvedValue(
      inbound(
        { id: 'src-a', content: docLabelled('Kafka') },
        { id: 'src-b', content: docLabelled('Kafka') },
        { id: 'src-c', content: docLabelled('unrelated label') }
      )
    );

    const res = await relabelInboundNoteLinks({ ...RENAME, dryRun: true });

    expect(res.data).toEqual({ notes: 2, links: 2 });
    expect(updateMany).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('never rebuilds the link graph', async () => {
    // Only the anchor text changed; every href is byte-for-byte what it was,
    // so the (sourceId, targetId) pairs are identical before and after. A
    // rebuild here would delete and reinsert rows to arrive at the rows it
    // started with — and could lose the graph if it failed halfway.
    linkFindMany.mockResolvedValue(
      inbound({ id: 'src-exact', content: docLabelled('Kafka') })
    );

    await relabelInboundNoteLinks(RENAME);

    expect(linkDeleteMany).not.toHaveBeenCalled();
    expect(linkCreateMany).not.toHaveBeenCalled();
  });

  it('skips a source whose document does not parse without failing the batch', async () => {
    // This walks other people's documents. One unparseable body must not
    // abort a rename, and must certainly not be overwritten.
    linkFindMany.mockResolvedValue(
      inbound(
        { id: 'src-broken', content: 'not json' },
        { id: 'src-exact', content: docLabelled('Kafka') }
      )
    );

    const res = await relabelInboundNoteLinks(RENAME);

    expect(res.success).toBe(true);
    expect(res.data).toEqual({ notes: 1, links: 1 });
    expect(writtenIds()).toEqual(['src-exact']);
  });

  it('writes nothing when the title did not actually change', async () => {
    // The editor's autosave sends the title on every pause in typing, so this
    // is the common call. Without the guard every matching anchor would be
    // rewritten to the value it already holds and pay for a real write.
    const res = await relabelInboundNoteLinks({
      noteId: 'note-1',
      previousTitle: 'Kafka',
      nextTitle: 'Kafka',
    });

    expect(res.data).toEqual({ notes: 0, links: 0 });
    expect(linkFindMany).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('spreads a large rewrite over several transactions', async () => {
    // A hub note can have hundreds of backlinks. One transaction locking
    // every source at once would block the author's own next keystroke on a
    // cosmetic edit, and `$transaction` yields nothing to the event loop
    // until the whole array resolves.
    linkFindMany.mockResolvedValue(
      inbound(
        ...Array.from({ length: 120 }, (_, index) => ({
          id: `src-${index}`,
          content: docLabelled('Kafka'),
        }))
      )
    );

    const res = await relabelInboundNoteLinks(RENAME);

    expect(res.data).toEqual({ notes: 120, links: 120 });
    expect(transaction).toHaveBeenCalledTimes(3);
    const sizes = transaction.mock.calls.map((call) => call[0].length);
    expect(sizes).toEqual([50, 50, 20]);
  });

  it('rejects an empty noteId through errorMsg instead of querying', async () => {
    const res = await relabelInboundNoteLinks({ ...RENAME, noteId: '' });

    expect(res.success).toBe(false);
    expect(linkFindMany).not.toHaveBeenCalled();
  });

  it('refuses a caller who is not the site owner', async () => {
    // `requireAdmin` runs before the try block, exactly as in `update-note`,
    // so an unauthorized call throws rather than returning an envelope. What
    // matters either way is that nothing was read and nothing was written.
    setTestUser(null);

    try {
      await expect(relabelInboundNoteLinks(RENAME)).rejects.toThrow(
        'Unauthorized'
      );
      expect(linkFindMany).not.toHaveBeenCalled();
      expect(updateMany).not.toHaveBeenCalled();
    } finally {
      resetTestUser();
    }
  });
});
