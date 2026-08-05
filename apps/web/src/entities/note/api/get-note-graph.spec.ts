/**
 * `getNoteGraph` is the one read behind the knowledge graph. Its contracts:
 * owner scoping on BOTH ends of every edge, a select that never carries a
 * document, and an edge set narrowed to nodes actually in the payload — an
 * edge pointing at an archived, foreign or folder note would draw a line to
 * nowhere, and would also inflate the degree of the node at the other end,
 * hiding exactly the orphan the graph exists to surface.
 *
 * The delegates are replaced wholesale rather than spied on, for the reason
 * `get-note-tree.spec.ts` records: Prisma 7 synthesizes a fresh function per
 * method access, so `spyOn(prisma.note, …)` patches a value the client never
 * reads back. `requireAdmin` is stubbed globally in `next-runtime-stubs.ts`
 * and resolves to `admin-1`; nothing here needs to mock it.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as GetNoteGraphModule from './get-note-graph';

let getNoteGraph: typeof GetNoteGraphModule.getNoteGraph;

beforeAll(async () => {
  ({ getNoteGraph } = await import('./get-note-graph'));
});

const findMany = mock();
const linkFindMany = mock();

Object.defineProperty(prisma, 'note', {
  value: { findMany },
  writable: true,
  configurable: true,
});
Object.defineProperty(prisma, 'noteLink', {
  value: { findMany: linkFindMany },
  writable: true,
  configurable: true,
});

const noteRow = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  title: id.toUpperCase(),
  status: 'draft',
  labels: [],
  ...over,
});

describe('getNoteGraph', () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([noteRow('a')]);
    linkFindMany.mockReset().mockResolvedValue([]);
  });

  it('scopes nodes to the owner and excludes archived notes and folders', async () => {
    await getNoteGraph();

    const where = findMany.mock.calls[0]?.[0]?.where as Record<string, unknown>;
    expect(where.ownerId).toBe('admin-1');
    expect(where.archivedAt).toBeNull();
    expect(where.isFolder).toBe(false);
  });

  it('scopes BOTH ends of every edge to the owner', async () => {
    await getNoteGraph();

    const where = linkFindMany.mock.calls[0]?.[0]?.where as {
      source: Record<string, unknown>;
      target: Record<string, unknown>;
    };
    expect(where.source.ownerId).toBe('admin-1');
    expect(where.target.ownerId).toBe('admin-1');
  });

  it('never selects the note documents', async () => {
    await getNoteGraph();

    const select = findMany.mock.calls[0]?.[0]?.select as Record<string, unknown>;
    expect(select.content).toBeUndefined();
    expect(select.plainText).toBeUndefined();
    expect(select.title).toBe(true);
  });

  it('computes degree from edges in both directions, leaving orphans at zero', async () => {
    findMany.mockResolvedValue([noteRow('a'), noteRow('b'), noteRow('c')]);
    linkFindMany.mockResolvedValue([{ sourceId: 'a', targetId: 'b' }]);

    const res = await getNoteGraph();

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    const byId = Object.fromEntries(res.data.nodes.map((n) => [n.id, n]));
    expect(byId.a?.degree).toBe(1);
    expect(byId.b?.degree).toBe(1);
    // The unlinked note the graph exists to surface (spec §6.6).
    expect(byId.c?.degree).toBe(0);
  });

  it('drops edges whose ends are not both in the node set', async () => {
    // `b` is archived or a folder, so it never made it into `nodes`. The SQL
    // `where` cannot express the folder case, which is why the membership
    // check below is what actually holds the invariant.
    findMany.mockResolvedValue([noteRow('a')]);
    linkFindMany.mockResolvedValue([{ sourceId: 'a', targetId: 'b' }]);

    const res = await getNoteGraph();

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.edges).toEqual([]);
    expect(res.data.nodes[0]?.degree).toBe(0);
  });

  it('maps label join rows to plain ids and carries status', async () => {
    findMany.mockResolvedValue([
      noteRow('a', { status: 'done', labels: [{ labelId: 'label-1' }] }),
    ]);

    const res = await getNoteGraph();

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.nodes[0]?.labelIds).toEqual(['label-1']);
    expect(res.data.nodes[0]?.status).toBe('done');
  });

  it('reports failure through errorMsg, never error', async () => {
    findMany.mockRejectedValue(new Error('connection refused'));

    const res = await getNoteGraph();

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect((res as { error?: unknown }).error).toBeUndefined();
  });
});
