import { beforeEach, describe, expect, it, mock } from 'bun:test';

import { ensureNoteFolderPath } from './ensure-note-folder-path';

const findFirst = mock();
const create = mock();

/** The subset of Prisma's client this function touches. */
const tx = {
  note: { findFirst, create },
} as unknown as Parameters<typeof ensureNoteFolderPath>[0];

beforeEach(() => {
  findFirst.mockReset();
  create.mockReset();
});

describe('ensureNoteFolderPath', () => {
  it('returns the existing folder without creating anything', async () => {
    findFirst.mockResolvedValue({ id: 'folder_rnd' });

    const id = await ensureNoteFolderPath(tx, 'owner_1', [{ title: 'R&D' }]);

    expect(id).toBe('folder_rnd');
    expect(create).not.toHaveBeenCalled();
  });

  it('creates a missing folder as a folder note', async () => {
    findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    create.mockResolvedValue({ id: 'folder_new' });

    const id = await ensureNoteFolderPath(tx, 'owner_1', [{ title: 'R&D' }]);

    expect(id).toBe('folder_new');
    expect(create.mock.calls[0][0].data).toMatchObject({
      ownerId: 'owner_1',
      title: 'R&D',
      isFolder: true,
      parentId: null,
    });
  });

  it('walks two levels, parenting the second to the first', async () => {
    findFirst.mockResolvedValueOnce({ id: 'folder_rnd' }).mockResolvedValueOnce(null);
    create.mockResolvedValue({ id: 'folder_project' });

    const id = await ensureNoteFolderPath(tx, 'owner_1', [
      { title: 'R&D' },
      { title: 'Face Anti-Spoofing' },
    ]);

    expect(id).toBe('folder_project');
    expect(create.mock.calls[0][0].data).toMatchObject({
      title: 'Face Anti-Spoofing',
      parentId: 'folder_rnd',
      isFolder: true,
    });
  });

  it('never retitles an existing folder', async () => {
    findFirst.mockResolvedValue({ id: 'folder_rnd' });

    await ensureNoteFolderPath(tx, 'owner_1', [{ title: 'R&D' }]);

    expect(create).not.toHaveBeenCalled();
    // No update delegate is even provided on `tx` — calling one would throw.
  });

  it('scopes the lookup to the owner and the parent', async () => {
    findFirst.mockResolvedValue({ id: 'folder_rnd' });

    await ensureNoteFolderPath(tx, 'owner_1', [{ title: 'R&D' }]);

    expect(findFirst.mock.calls[0][0].where).toMatchObject({
      ownerId: 'owner_1',
      parentId: null,
      title: 'R&D',
      isFolder: true,
    });
  });

  it('resolves relative to startParentId, so a subfolder lands inside the project', async () => {
    findFirst.mockResolvedValue(null);
    create.mockResolvedValue({ id: 'folder_experiments' });

    const id = await ensureNoteFolderPath(
      tx,
      'owner_1',
      [{ title: 'experiments' }],
      'folder_project'
    );

    expect(id).toBe('folder_experiments');
    expect(findFirst.mock.calls[0][0].where).toMatchObject({ parentId: 'folder_project' });
    expect(create.mock.calls[0][0].data).toMatchObject({ parentId: 'folder_project' });
  });

  it('returns startParentId unchanged when there are no segments', async () => {
    expect(await ensureNoteFolderPath(tx, 'owner_1', [], 'folder_project')).toBe('folder_project');
    expect(findFirst).not.toHaveBeenCalled();
  });

  // --- Blind-spot hunt additions below ---
  //
  // The "never retitles" test above only proves nothing happened *because the
  // shared `tx` mock has no `update` delegate at all* — the moment some other
  // test in this suite needs one and adds it to `tx.note`, that protection
  // disappears silently. This test gives the delegate on its own local `tx` so
  // the assertion keeps meaning something no matter what the shared mock grows.
  it('never calls update on an existing folder, even when update is available to call', async () => {
    const update = mock();
    const localTx = {
      note: { findFirst, create, update },
    } as unknown as Parameters<typeof ensureNoteFolderPath>[0];
    findFirst.mockResolvedValue({ id: 'folder_rnd' });

    await ensureNoteFolderPath(localTx, 'owner_1', [{ title: 'R&D' }]);

    expect(update).not.toHaveBeenCalled();
  });

  // None of the tests above ever inspect `position`, so a wrong sibling query
  // (wrong parentId, or the value dropped altogether) would pass every one of
  // them. This pins both: the value written is `lastSibling.position + 1`, and
  // the sibling lookup for the *second* level is scoped to the parent folder
  // just created — not to the vault root the first level used.
  it('computes position from the last sibling in the correct parent, at every level', async () => {
    findFirst
      .mockResolvedValueOnce({ id: 'folder_rnd' }) // existing-check: 'R&D' found
      .mockResolvedValueOnce(null) // existing-check: 'Face Anti-Spoofing' missing
      .mockResolvedValueOnce({ position: 4 }); // sibling lookup inside folder_rnd
    create.mockResolvedValue({ id: 'folder_project' });

    await ensureNoteFolderPath(tx, 'owner_1', [
      { title: 'R&D' },
      { title: 'Face Anti-Spoofing' },
    ]);

    // The sibling lookup that produced { position: 4 } must have been scoped
    // to folder_rnd, not to the vault root.
    expect(findFirst.mock.calls[2][0].where).toMatchObject({ parentId: 'folder_rnd' });
    expect(create.mock.calls[0][0].data.position).toBe(5);
  });
});
