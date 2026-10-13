/**
 * The row goes before the storage object. A failed row delete keeps the file, so
 * no row is left pointing at nothing; a failed storage delete after the row is an
 * orphan object, logged and not reported to the caller as a failure.
 *
 * Prisma's `media` delegate is replaced by an in-memory one, and the storage
 * object is a spy on the shared instance, so each test reads the order of the
 * writes back from `events`.
 */
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  spyOn,
} from 'bun:test';

import { deleteMedia } from './delete-media';

import { supabaseStorage } from '@/shared/api/s3-storage-api';

const MEDIA_ID = 'cl9ebqhxk00003b600tymydho';
const OWNER_ID = 'admin-1';
const FILE_KEY = `users/${OWNER_ID}/media/blog/2026/10/abc.png`;

type Row = { id: string; userId: string; fileKey: string };

const events: string[] = [];
let row: Row | null = null;
let failRowDelete = false;

const mediaDelegate = {
  findFirst: async ({ where }: { where: { id: string; userId: string } }) =>
    row && row.id === where.id && row.userId === where.userId ? row : null,
  delete: async ({ where }: { where: { id: string } }) => {
    if (failRowDelete) throw new Error('database unavailable');
    if (!row || row.id !== where.id) throw new Error('Record not found');
    events.push('row');
    const deleted = row;
    row = null;
    return deleted;
  },
};

const originalMedia = Object.getOwnPropertyDescriptor(prisma, 'media');
Object.defineProperty(prisma, 'media', {
  value: mediaDelegate,
  writable: true,
  configurable: true,
});

const deleteFile = spyOn(supabaseStorage, 'deleteFile');
const logWarn = spyOn(logger, 'warn').mockImplementation(() => {});
const logError = spyOn(logger, 'error').mockImplementation(() => {});

beforeEach(() => {
  events.length = 0;
  row = { id: MEDIA_ID, userId: OWNER_ID, fileKey: FILE_KEY };
  failRowDelete = false;
  deleteFile.mockReset().mockImplementation(async () => {
    events.push('object');
    return { $metadata: {} };
  });
  logWarn.mockClear();
  logError.mockClear();
});

afterAll(() => {
  if (originalMedia) Object.defineProperty(prisma, 'media', originalMedia);
  deleteFile.mockRestore();
  logWarn.mockRestore();
  logError.mockRestore();
});

describe('deleteMedia', () => {
  it('deletes the row before the storage object', async () => {
    const res = await deleteMedia(MEDIA_ID);

    expect(res.success).toBe(true);
    expect(events).toEqual(['row', 'object']);
    expect(deleteFile).toHaveBeenCalledWith(FILE_KEY);
  });

  it('keeps the storage object when the row delete fails', async () => {
    failRowDelete = true;

    const res = await deleteMedia(MEDIA_ID);

    expect(res.success).toBe(false);
    expect(events).toEqual([]);
    expect(deleteFile).not.toHaveBeenCalled();
  });

  it('still reports success when the storage delete fails, and logs the orphan', async () => {
    deleteFile.mockImplementation(async () => {
      events.push('object');
      throw new Error('storage unavailable');
    });

    const res = await deleteMedia(MEDIA_ID);

    expect(res.success).toBe(true);
    expect(row).toBeNull();
    expect(events).toEqual(['row', 'object']);
    expect(logWarn).toHaveBeenCalledTimes(1);
  });
});
