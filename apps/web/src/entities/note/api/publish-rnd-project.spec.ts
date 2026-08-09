import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as PublishModule from './publish-rnd-project';

import type { RndPublishFile } from '@/entities/note/model/rnd-publish-schema';

let publishRndProject: typeof PublishModule.publishRndProject;

beforeAll(async () => {
  ({ publishRndProject } = await import('./publish-rnd-project'));
});

const findFirst = mock();
const findMany = mock();
const create = mock();
const update = mock();
const updateMany = mock();
Object.defineProperty(prisma, 'note', {
  value: { findFirst, findMany, create, update, updateMany },
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

// The callback form: hand the callback the same mocked client.
const transaction = mock((fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
Object.defineProperty(prisma, '$transaction', {
  value: transaction,
  writable: true,
  configurable: true,
});

let created = 0;

beforeEach(() => {
  created = 0;
  for (const m of [findFirst, findMany, create, update, updateMany, linkDeleteMany, linkCreateMany]) {
    m.mockReset();
  }
  // Default: nothing exists yet, and every create yields a fresh id.
  findFirst.mockResolvedValue(null);
  findMany.mockResolvedValue([]);
  create.mockImplementation(() => Promise.resolve({ id: `note_${++created}` }));
  update.mockImplementation(() => Promise.resolve({ id: 'note_1' }));
  // Default: an archive updateMany matched a note, so a test that exercises
  // `deleted` without overriding this (unlike the "scopes the archive" test
  // below) still gets a `{ count }` to read rather than `undefined`.
  updateMany.mockResolvedValue({ count: 1 });
  linkDeleteMany.mockResolvedValue({ count: 0 });
  linkCreateMany.mockResolvedValue({ count: 0 });
});

function input(files: RndPublishFile[]) {
  return {
    project: 'face-anti-spoofing',
    title: 'Face Anti-Spoofing',
    notesRoot: 'R&D/face-anti-spoofing',
    files,
    deleted: [] as string[],
  };
}

/** The `data` of the create call that wrote the note for `title`. */
function createdWithTitle(title: string): Record<string, unknown> | undefined {
  return create.mock.calls.map((c) => c[0].data).find((d) => d.title === title);
}

/**
 * The mock id assigned to the note created for `title`.
 *
 * `create`'s mock hands out `note_<n>` in call order, and folder creation
 * (`ensureNoteFolderPath`) shares the same mocked `tx.note.create` — so the
 * file note is not necessarily the first or second call. Deriving the id from
 * its position, rather than hardcoding `note_1`/`note_2`, keeps this test
 * honest about that rather than accidentally depending on how many folders
 * get created first.
 */
function createdNoteId(title: string): string | undefined {
  const index = create.mock.calls.findIndex((c) => (c[0].data as Record<string, unknown>).title === title);
  return index === -1 ? undefined : `note_${index + 1}`;
}

describe('publishRndProject', () => {
  it('creates a note per file and reports its url', async () => {
    const result = await publishRndProject(
      'owner_1',
      input([
        { path: '00-overview.md', frontmatter: { title: 'Overview' }, markdown: '# Overview\n' },
      ])
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.results).toHaveLength(1);
    expect(result.data.results[0].path).toBe('00-overview.md');
    expect(result.data.results[0].url).toBe(`/space/notes/${result.data.results[0].noteId}`);
    expect(result.data.results[0].action).toBe('created');
  });

  it('derives plainText on the server and stores rnd_path in properties', async () => {
    await publishRndProject(
      'owner_1',
      input([
        {
          path: '00-overview.md',
          frontmatter: { title: 'Overview', status: 'active' },
          markdown: 'kafka consumer rebalance\n',
        },
      ])
    );

    const data = createdWithTitle('Overview');
    expect(data?.plainText).toContain('kafka consumer rebalance');
    expect((data?.properties as Record<string, unknown>).rnd_path).toBe('00-overview.md');
  });

  it('maps status onto the column, not into properties', async () => {
    await publishRndProject(
      'owner_1',
      input([
        { path: '00-overview.md', frontmatter: { title: 'Overview', status: 'blocked' }, markdown: 'x' },
      ])
    );

    const data = createdWithTitle('Overview');
    expect(data?.status).toBe('blocked');
    expect((data?.properties as Record<string, unknown>).status).toBeUndefined();
  });

  it('updates in place when the path already has a note, even after a retitle', async () => {
    findFirst.mockImplementation((args: { where: Record<string, unknown> }) => {
      // Folder lookups ask for isFolder: true; the note lookup does not.
      if (args.where.isFolder === true) return Promise.resolve({ id: 'folder_x' });
      return Promise.resolve({ id: 'note_existing', title: 'Old Title' });
    });

    const result = await publishRndProject(
      'owner_1',
      input([{ path: '00-overview.md', frontmatter: { title: 'New Title' }, markdown: 'x' }])
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.results[0].action).toBe('updated');
    expect(result.data.results[0].noteId).toBe('note_existing');
    expect(create).not.toHaveBeenCalled();
  });

  it('resolves a link to a file created in the same request', async () => {
    await publishRndProject(
      'owner_1',
      input([
        {
          path: '00-overview.md',
          frontmatter: { title: 'Overview' },
          markdown: 'see [baseline](./experiments/exp-001.md)\n',
        },
        {
          path: 'experiments/exp-001.md',
          frontmatter: { title: 'exp-001' },
          markdown: 'baseline\n',
        },
      ])
    );

    // The link pass runs after every note exists, so it lands in an update.
    const linkUpdate = update.mock.calls
      .map((c) => c[0])
      .find((args) => typeof args.data?.content === 'string' && args.data.content.includes('/space/notes/'));

    expect(linkUpdate).toBeDefined();
    expect(linkUpdate?.data.content).not.toContain('./experiments/exp-001.md');
  });

  it('archives a deleted path instead of removing the note', async () => {
    findFirst.mockImplementation((args: { where: Record<string, unknown> }) =>
      args.where.isFolder === true
        ? Promise.resolve({ id: 'folder_x' })
        : Promise.resolve({ id: 'note_gone', title: 'scratch' })
    );

    const payload = input([
      { path: '00-overview.md', frontmatter: { title: 'Overview' }, markdown: 'x' },
    ]);
    payload.deleted = ['experiments/exp-000-scratch.md'];

    const result = await publishRndProject('owner_1', payload);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.archived).toEqual(['experiments/exp-000-scratch.md']);
    const archiving = updateMany.mock.calls.map((c) => c[0]).find((a) => a.data?.archivedAt);
    expect(archiving).toBeDefined();
  });

  it('scopes the archive to this project, not to every note sharing the path', async () => {
    // `rnd_path` is relative to docs/rnd/, so every project has an
    // `00-overview.md`. Without the project half of the key, deleting one
    // project's overview would archive every other project's overview too.
    findFirst.mockImplementation((args: { where: Record<string, unknown> }) =>
      args.where.isFolder === true
        ? Promise.resolve({ id: 'folder_x' })
        : Promise.resolve(null)
    );
    updateMany.mockResolvedValue({ count: 1 });

    const payload = input([
      { path: '00-overview.md', frontmatter: { title: 'Overview' }, markdown: 'x' },
    ]);
    payload.deleted = ['00-overview.md'];

    await publishRndProject('owner_1', payload);

    const archiving = updateMany.mock.calls.map((c) => c[0]).find((a) => a.data?.archivedAt);
    const conditions = (archiving?.where.AND ?? []) as Record<string, unknown>[];
    const serialized = JSON.stringify(conditions);

    expect(serialized).toContain('rnd_project');
    expect(serialized).toContain('face-anti-spoofing');
    expect(serialized).toContain('rnd_path');
    // The project key alone is not enough: without `ownerId` too, archiving
    // would reach into another owner's note that happens to share the same
    // `rnd_project`/`rnd_path` pair — the exact blast radius the project key
    // exists to prevent, just moved one level up.
    expect(archiving?.where.ownerId).toBe('owner_1');
  });

  it('moves a note when its file moves, instead of forking a second note', async () => {
    // The identity is the project-qualified path, not the tree position, so a
    // file that moves into experiments/ must be re-parented rather than
    // re-created — otherwise the move reads as a delete plus a create and the
    // note's links and history are lost.
    findFirst.mockImplementation((args: { where: Record<string, unknown> }) =>
      args.where.isFolder === true
        ? Promise.resolve({ id: 'folder_experiments' })
        : Promise.resolve({ id: 'note_moved' })
    );

    await publishRndProject(
      'owner_1',
      input([
        {
          path: 'experiments/exp-001.md',
          frontmatter: { title: 'exp-001' },
          markdown: 'baseline',
        },
      ])
    );

    expect(create).not.toHaveBeenCalled();
    const reparent = update.mock.calls
      .map((c) => c[0])
      .find((args) => args.data?.parentId !== undefined);
    expect(reparent?.data.parentId).toBe('folder_experiments');
  });

  it('returns the failure envelope with errorMsg when the transaction throws', async () => {
    transaction.mockImplementationOnce(() => Promise.reject(new Error('db is down')));

    const result = await publishRndProject(
      'owner_1',
      input([{ path: '00-overview.md', frontmatter: { title: 'Overview' }, markdown: 'x' }])
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(typeof result.errorMsg).toBe('string');
  });

  // Blind-spot: writing `content` directly bypasses `update-note.ts`'s link
  // rebuild, and nothing else in this suite asserts on `noteLink`. Deleting
  // the whole rebuild block left every other test in this file green.
  it('rebuilds NoteLink rows from the rewritten document', async () => {
    findMany.mockImplementation((args: { where?: { id?: { in?: string[] } } }) =>
      Promise.resolve((args.where?.id?.in ?? []).map((id) => ({ id })))
    );

    await publishRndProject(
      'owner_1',
      input([
        {
          path: '00-overview.md',
          frontmatter: { title: 'Overview' },
          markdown: 'see [baseline](./experiments/exp-001.md)\n',
        },
        {
          path: 'experiments/exp-001.md',
          frontmatter: { title: 'exp-001' },
          markdown: 'baseline\n',
        },
      ])
    );

    const sourceId = createdNoteId('Overview');
    const targetId = createdNoteId('exp-001');
    if (!sourceId || !targetId) throw new Error('expected both notes to have been created');

    expect(linkDeleteMany).toHaveBeenCalledWith({ where: { sourceId } });
    const createCall = linkCreateMany.mock.calls
      .map((c) => c[0] as { data: { sourceId: string; targetId: string }[] })
      .find((a) => a.data.some((row) => row.sourceId === sourceId));
    expect(createCall?.data).toEqual([{ sourceId, targetId }]);

    // The target lookup is scoped to this owner. Without it, a document that
    // pastes in someone else's note id as a link target would turn into a
    // real cross-owner NoteLink edge the moment `findMany` happened to return
    // a match for it.
    const targetLookup = findMany.mock.calls.map((c) => c[0] as { where: Record<string, unknown> })[0];
    expect(targetLookup?.where.ownerId).toBe('owner_1');
  });

  // Blind-spot: the fix for the no-op-rewrite gap above only exercises a
  // document that already has a link. A document with NO links at all never
  // triggers a rewrite either (nothing to rewrite), so it exercises the exact
  // same code path the no-op case does — reusing that path for a link removal
  // is the whole point of the fix.
  it('rebuilds NoteLink rows even when the document has no links to rewrite', async () => {
    await publishRndProject(
      'owner_1',
      input([{ path: '00-overview.md', frontmatter: { title: 'Overview' }, markdown: 'no links here\n' }])
    );

    const noteId = createdNoteId('Overview');
    if (!noteId) throw new Error('expected the note to have been created');

    expect(linkDeleteMany).toHaveBeenCalledWith({ where: { sourceId: noteId } });
  });

  // Minor: no test published a document that links to itself, so the
  // self-link filter (`.filter((id) => id !== result.noteId)`) was unpinned.
  it('drops a self-link rather than writing a NoteLink to itself', async () => {
    findMany.mockImplementation((args: { where?: { id?: { in?: string[] } } }) =>
      Promise.resolve((args.where?.id?.in ?? []).map((id) => ({ id })))
    );

    await publishRndProject(
      'owner_1',
      input([
        {
          path: '00-overview.md',
          frontmatter: { title: 'Overview' },
          markdown: 'see [itself](./00-overview.md)\n',
        },
      ])
    );

    const noteId = createdNoteId('Overview');
    if (!noteId) throw new Error('expected the note to have been created');

    const createCall = linkCreateMany.mock.calls
      .map((c) => c[0] as { data: { sourceId: string; targetId: string }[] })
      .find((a) => a.data.some((row) => row.sourceId === noteId));
    expect(createCall).toBeUndefined();
  });

  // Blind-spot: every existing `findFirst` mock ignores its arguments, so
  // nothing pins the identity lookup to `ownerId`. Without it, the lookup
  // would match another owner's note sharing the same `rnd_project` /
  // `rnd_path` pair and silently overwrite it.
  it('scopes the identity lookup to this owner', async () => {
    await publishRndProject(
      'owner_1',
      input([{ path: '00-overview.md', frontmatter: { title: 'Overview' }, markdown: 'x' }])
    );

    // The identity lookup is the only `findFirst` call whose `where` carries
    // the `AND` of rnd_project/rnd_path conditions — the folder lookups ask
    // for `isFolder: true`, and the position lookup carries `orderBy` instead.
    const identityLookup = findFirst.mock.calls
      .map((c) => c[0] as { where: Record<string, unknown> })
      .find((args) => Array.isArray(args.where.AND));

    expect(identityLookup?.where.ownerId).toBe('owner_1');
  });

  // Blind-spot: the earlier "stores rnd_path in properties" test never checks
  // the project half. Stripping `rnd_project` out of the write (while leaving
  // it in the archive query) left every other test in this file green.
  it('stores rnd_project in properties, the same identity half the archive query relies on', async () => {
    await publishRndProject(
      'owner_1',
      input([{ path: '00-overview.md', frontmatter: { title: 'Overview' }, markdown: 'x' }])
    );

    const data = createdWithTitle('Overview');
    expect((data?.properties as Record<string, unknown>).rnd_project).toBe('face-anti-spoofing');
  });

  // Blind-spot: "maps status onto the column, not into properties" only
  // checks `status`; `title` owns a column exactly the same way, and nothing
  // checked it. Dropping `title` from the column-key exclusion left every
  // other test in this file green.
  it('does not duplicate title into properties, which owns a column the same way status does', async () => {
    await publishRndProject(
      'owner_1',
      input([{ path: '00-overview.md', frontmatter: { title: 'Overview' }, markdown: 'x' }])
    );

    const data = createdWithTitle('Overview');
    expect((data?.properties as Record<string, unknown>).title).toBeUndefined();
  });
});
