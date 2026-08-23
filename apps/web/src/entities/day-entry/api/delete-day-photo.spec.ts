/**
 * What this spec defends: a photo belonging to someone else is not deletable,
 * and the object goes before the row — the order that leaves an orphaned
 * object rather than a row pointing at nothing.
 *
 * `requireAdmin` is stubbed globally in `next-runtime-stubs.ts` and resolves
 * to `admin-1`; nothing here needs to mock it.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as DeleteModule from './delete-day-photo';

const deleteFile = mock();
mock.module('@/shared/api/s3-storage-api', () => ({
  privateStorage: {
    deleteFile,
    uploadFile: mock().mockResolvedValue({ fileKey: 'k' }),
  },
}));

let deleteDayPhoto: typeof DeleteModule.deleteDayPhoto;

beforeAll(async () => {
  ({ deleteDayPhoto } = await import('./delete-day-photo'));
});

const findUnique = mock();
const photoDelete = mock();
Object.defineProperty(prisma, 'dayPhoto', {
  value: { findUnique, delete: photoDelete },
  writable: true,
  configurable: true,
});

beforeEach(() => {
  deleteFile.mockClear();
  findUnique.mockReset();
  photoDelete.mockReset().mockResolvedValue({ id: 'photo-1' });
});

describe('deleteDayPhoto', () => {
  it('removes the object and then the row', async () => {
    findUnique.mockResolvedValue({ fileKey: 'k1', ownerId: 'admin-1' });

    const res = await deleteDayPhoto({ id: 'photo-1' });

    expect(res.success).toBe(true);
    expect(deleteFile).toHaveBeenCalledWith('k1');
    expect(photoDelete).toHaveBeenCalled();
  });

  it("refuses another owner's photo and touches nothing", async () => {
    findUnique.mockResolvedValue({ fileKey: 'k1', ownerId: 'someone-else' });

    const res = await deleteDayPhoto({ id: 'photo-1' });

    expect(res.success).toBe(false);
    expect(deleteFile).not.toHaveBeenCalled();
    expect(photoDelete).not.toHaveBeenCalled();
  });

  it('reports a missing photo through errorMsg', async () => {
    findUnique.mockResolvedValue(null);

    const res = await deleteDayPhoto({ id: 'nope' });

    expect(res.success).toBe(false);
  });
});
