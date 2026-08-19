/**
 * `stripNotePresentation` is the one maintenance job that edits documents
 * rather than recomputing something derived from them, so what it defends is
 * both halves of that: what it removes, and — more importantly — everything it
 * must leave standing.
 *
 * - The presentation a paste brings in is gone: `textStyle`/`color`, a
 *   highlight's background, `colwidth` copied out of a source `<colgroup>`, a
 *   link's foreign `class`.
 * - Structure and semantics survive: table nodes and their header cells, cell
 *   spans, list items, code blocks, headings, bold/italic/strike, `<mark>`
 *   itself, and above all a link's `href` — the link graph is derived from
 *   those hrefs and is deliberately not rebuilt, which is only safe because
 *   none of them moves.
 * - A note with nothing to strip is NOT written. `updatedAt` is `@updatedAt`
 *   and the explorer's default order is "recently updated", so an
 *   unconditional rewrite would stamp the whole vault within seconds of itself.
 * - `plainText` is re-derived alongside `content`, never carried; `searchVector`
 *   is never named, being generated in SQL.
 * - A caller who is not the site owner gets nothing read and nothing written.
 *
 * The delegates are replaced wholesale rather than spied on, for the reason
 * `get-notes-page.spec.ts` records — Prisma 7 synthesizes a fresh function on
 * every method access. `requireAdmin` is stubbed globally to `admin-1`.
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

import type * as StripModule from './strip-note-presentation';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

let stripNotePresentation: typeof StripModule.stripNotePresentation;

beforeAll(async () => {
  ({ stripNotePresentation } = await import('./strip-note-presentation'));
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

/**
 * Stubbed although this action must never call them — that is precisely why.
 * Absent from the delegate, an accidental link rebuild would fail with "not a
 * function", which reads like a harness gap rather than the contract violation
 * it is.
 */
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

const pageArgs = () =>
  noteFindMany.mock.calls[0]?.[0] as {
    where: Record<string, unknown>;
    select: Record<string, unknown>;
    orderBy?: unknown;
    take?: number;
    cursor?: { id: string };
    skip?: number;
  };

const writes = () =>
  noteUpdateMany.mock.calls.map(
    (call) =>
      call[0] as {
        where: Record<string, unknown>;
        data: { content?: string; plainText?: string };
      }
  );

/** The document the first write produced, parsed back. */
function writtenDoc(index = 0): Record<string, unknown> {
  const content = writes()[index]?.data.content;
  if (typeof content !== 'string') {
    throw new Error(`no document written at index ${index}`);
  }
  return JSON.parse(content) as Record<string, unknown>;
}

interface DocNode {
  type?: string;
  attrs?: Record<string, unknown>;
  marks?: { type?: string; attrs?: Record<string, unknown> }[];
  content?: DocNode[];
  text?: string;
}

function walk(node: DocNode, visit: (node: DocNode) => void): void {
  visit(node);
  for (const child of node.content ?? []) walk(child, visit);
}

function nodesOfType(doc: DocNode, type: string): DocNode[] {
  const found: DocNode[] = [];
  walk(doc, (node) => {
    if (node.type === type) found.push(node);
  });
  return found;
}

function markTypes(doc: DocNode): string[] {
  const types: string[] = [];
  walk(doc, (node) => {
    for (const mark of node.marks ?? []) {
      if (mark.type) types.push(mark.type);
    }
  });
  return types;
}

/** Every attribute value in the document — colour hides in several. */
function attrValues(doc: DocNode): unknown[] {
  const values: unknown[] = [];
  walk(doc, (node) => {
    values.push(...Object.values(node.attrs ?? {}));
    for (const mark of node.marks ?? []) {
      values.push(...Object.values(mark.attrs ?? {}));
    }
  });
  return values;
}

function textOf(doc: DocNode): string {
  let text = '';
  walk(doc, (node) => {
    if (typeof node.text === 'string') text += node.text;
  });
  return text;
}

/**
 * A table pasted out of a spreadsheet, as it was actually stored before the
 * paste fix landed: cell text wearing the source's colour, a highlight carrying
 * the source's wash, `colwidth` from its `<colgroup>`, and a link whose `class`
 * came from the source page.
 */
const PASTED = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Quarterly summary' }],
    },
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableHeader',
              attrs: { colspan: 2, rowspan: 1, colwidth: [217, 132] },
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      marks: [
                        { type: 'bold' },
                        { type: 'textStyle', attrs: { color: '#ffffff' } },
                      ],
                      text: 'Region',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableCell',
              attrs: { colspan: 1, rowspan: 1, colwidth: [217] },
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      marks: [
                        { type: 'textStyle', attrs: { color: '#073763' } },
                        {
                          type: 'link',
                          attrs: {
                            href: 'https://example.com/spec',
                            target: '_blank',
                            rel: 'noopener',
                            class: 'external text',
                          },
                        },
                      ],
                      text: 'EMEA',
                    },
                    {
                      type: 'text',
                      marks: [
                        { type: 'highlight', attrs: { color: '#ffff00' } },
                        { type: 'italic' },
                      ],
                      text: ' 12,400',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});

/** A note that only ever knew this editor's own formatting. */
const CLEAN = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', marks: [{ type: 'strike' }], text: 'done' },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'codeBlock',
      attrs: { language: 'ts' },
      content: [{ type: 'text', text: 'const x = 1;' }],
    },
  ],
});

function page(...notes: { id: string; content: string }[]) {
  noteFindMany.mockResolvedValue(notes);
}

describe('stripNotePresentation', () => {
  beforeEach(() => {
    noteCount.mockReset().mockResolvedValue(0);
    noteFindMany.mockReset();
    noteUpdateMany.mockReset().mockResolvedValue({ count: 1 });
    linkDeleteMany.mockReset();
    linkCreateMany.mockReset();
    transaction.mockClear();
    page({ id: 'note-1', content: CLEAN });
  });

  it('pages over the caller’s own documents, never folders', async () => {
    await stripNotePresentation({});

    expect(pageArgs().where.ownerId).toBe('admin-1');
    expect(pageArgs().where.isFolder).toBe(false);
  });

  it('orders by id ascending and probes one row past the page', async () => {
    await stripNotePresentation({ limit: 10 });

    // Paging by `updatedAt` would reorder the corpus behind the cursor on
    // every row this job rewrote, and the next batch would skip what moved.
    expect(pageArgs().orderBy).toEqual({ id: 'asc' });
    expect(pageArgs().take).toBe(11);
  });

  it('passes the cursor to Prisma exclusively, and omits it on the first call', async () => {
    await stripNotePresentation({ cursor: 'note-9' });
    expect(pageArgs().cursor).toEqual({ id: 'note-9' });
    expect(pageArgs().skip).toBe(1);

    noteFindMany.mockClear();
    await stripNotePresentation({});
    expect(pageArgs().cursor).toBeUndefined();
    expect(pageArgs().skip).toBeUndefined();
  });

  it('clamps the page size instead of failing the job', async () => {
    await stripNotePresentation({ limit: 100000 });
    expect(pageArgs().take).toBe(101);

    noteFindMany.mockClear();
    await stripNotePresentation({ limit: -5 });
    expect(pageArgs().take).toBe(26);
  });

  it('rejects a cursor that has lost its place rather than restarting silently', async () => {
    const res = await stripNotePresentation({ cursor: '' });

    expect(res.success).toBe(false);
    expect(noteFindMany).not.toHaveBeenCalled();
  });

  it('removes every textStyle mark and the colour it carried', async () => {
    page({ id: 'note-1', content: PASTED });

    await stripNotePresentation({});

    const doc = writtenDoc() as DocNode;
    expect(markTypes(doc)).not.toContain('textStyle');
    expect(attrValues(doc)).not.toContain('#ffffff');
    expect(attrValues(doc)).not.toContain('#073763');
  });

  it('keeps the highlight but drops the source’s background colour', async () => {
    page({ id: 'note-1', content: PASTED });

    await stripNotePresentation({});

    const doc = writtenDoc() as DocNode;
    // `<mark>` is semantic — losing it would lose the fact that a passage was
    // marked at all. Only the wash goes.
    expect(markTypes(doc).filter((type) => type === 'highlight')).toHaveLength(
      1
    );
    expect(attrValues(doc)).not.toContain('#ffff00');
  });

  it('drops column widths copied from the source table', async () => {
    page({ id: 'note-1', content: PASTED });

    await stripNotePresentation({});

    const doc = writtenDoc() as DocNode;
    const cells = [
      ...nodesOfType(doc, 'tableCell'),
      ...nodesOfType(doc, 'tableHeader'),
    ];
    expect(cells).toHaveLength(2);
    for (const cell of cells) expect(cell.attrs?.colwidth).toBeNull();
  });

  it('keeps a link’s href and drops the source page’s class', async () => {
    page({ id: 'note-1', content: PASTED });

    await stripNotePresentation({});

    const doc = writtenDoc() as DocNode;
    const link = nodesOfType(doc, 'text')
      .flatMap((node) => node.marks ?? [])
      .find((mark) => mark.type === 'link');

    // The href is the whole reason the `NoteLink` rows are left alone: the
    // (sourceId, targetId) set is derived from these, so it cannot move.
    expect(link?.attrs?.href).toBe('https://example.com/spec');
    expect(link?.attrs?.target).toBe('_blank');
    expect(link?.attrs?.rel).toBe('noopener');
    expect(link?.attrs?.class).toBeNull();
  });

  it('keeps structure, spans and the marks that mean something', async () => {
    page({ id: 'note-1', content: PASTED });

    await stripNotePresentation({});

    const doc = writtenDoc() as DocNode;
    expect(nodesOfType(doc, 'table')).toHaveLength(1);
    expect(nodesOfType(doc, 'tableRow')).toHaveLength(2);
    expect(nodesOfType(doc, 'tableHeader')).toHaveLength(1);
    expect(nodesOfType(doc, 'heading')[0]?.attrs?.level).toBe(2);
    expect(nodesOfType(doc, 'tableHeader')[0]?.attrs?.colspan).toBe(2);
    expect(markTypes(doc)).toContain('bold');
    expect(markTypes(doc)).toContain('italic');
    expect(textOf(doc)).toBe('Quarterly summaryRegionEMEA 12,400');
  });

  it('never touches the link graph', async () => {
    page({ id: 'note-1', content: PASTED });

    await stripNotePresentation({});

    // Every href is byte-for-byte what it was, so a rebuild would delete and
    // reinsert rows to arrive at the rows it started with.
    expect(linkDeleteMany).not.toHaveBeenCalled();
    expect(linkCreateMany).not.toHaveBeenCalled();
  });

  it('reports a note it did not have to change as unchanged, and writes nothing', async () => {
    const res = await stripNotePresentation({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.processed).toBe(1);
    expect(res.data.changed).toBe(0);
    // Not merely a saved write: `updatedAt` is `@updatedAt` and the explorer
    // orders by it, so rewriting unconditionally would restamp the vault.
    expect(noteUpdateMany).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('reports examined and changed separately across a mixed page', async () => {
    page(
      { id: 'note-1', content: CLEAN },
      { id: 'note-2', content: PASTED },
      { id: 'note-3', content: 'not json at all' }
    );

    const res = await stripNotePresentation({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.processed).toBe(3);
    expect(res.data.changed).toBe(1);
    expect(writes()).toHaveLength(1);
    expect(writes()[0]?.where.id).toBe('note-2');
  });

  it('scopes each write to the calling owner', async () => {
    page({ id: 'note-1', content: PASTED });

    await stripNotePresentation({});

    // `updateMany` takes a full `where`, so ownership is enforced by the same
    // statement that writes — the reason `updateNote` uses it too.
    expect(writes()[0]?.where).toEqual({ id: 'note-1', ownerId: 'admin-1' });
  });

  it('writes content and a re-derived plainText, and nothing else', async () => {
    page({ id: 'note-1', content: PASTED });

    await stripNotePresentation({});

    const data = writes()[0]?.data ?? {};
    expect(Object.keys(data).sort()).toEqual(['content', 'plainText']);
    // Generated in SQL from title + plain_text; Prisma must never write it.
    expect('searchVector' in data).toBe(false);
    expect(data.plainText).toBe('Quarterly summary Region EMEA 12,400');
  });

  it('runs the batch’s writes in one transaction', async () => {
    page({ id: 'note-1', content: PASTED }, { id: 'note-2', content: PASTED });

    await stripNotePresentation({});

    // All-or-nothing per batch, so the cursor the client retries from still
    // means what it says after a failure partway.
    expect(transaction).toHaveBeenCalledTimes(1);
    expect((transaction.mock.calls[0]?.[0] as unknown[]).length).toBe(2);
  });

  it('reports the last id of a full page as the next cursor', async () => {
    page(
      { id: 'note-1', content: CLEAN },
      { id: 'note-2', content: CLEAN },
      { id: 'note-3', content: PASTED }
    );

    const res = await stripNotePresentation({ limit: 2 });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.processed).toBe(2);
    expect(res.data.nextCursor).toBe('note-2');
    // The probe row belongs to the next call and must not be written now.
    expect(noteUpdateMany).not.toHaveBeenCalled();
  });

  it('reports a null cursor when the corpus is exhausted', async () => {
    const res = await stripNotePresentation({ limit: 5 });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.nextCursor).toBeNull();
  });

  it('reports failure through errorMsg, never error', async () => {
    noteFindMany.mockRejectedValue(new Error('connection refused'));

    const res = await stripNotePresentation({});

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect((res as { error?: unknown }).error).toBeUndefined();
  });

  it('refuses a caller who is not the site owner', async () => {
    // `requireAdmin` runs before the try block, exactly as in `update-note`,
    // so an unauthorized call throws rather than returning an envelope. What
    // matters either way is that nothing was read and nothing was written.
    setTestUser(null);

    try {
      await expect(stripNotePresentation({})).rejects.toThrow('Unauthorized');
      expect(noteFindMany).not.toHaveBeenCalled();
      expect(noteUpdateMany).not.toHaveBeenCalled();
    } finally {
      resetTestUser();
    }
  });

  afterAll(resetTestUser);
});
