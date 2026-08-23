/**
 * What this spec defends: photos land in the PRIVATE bucket under the day's
 * own prefix, an SVG is refused even though the media library accepts them,
 * the per-day ceiling counts photos already stored, and the entry is created
 * when the first photo lands on an untouched day.
 *
 * `requireAdmin` is stubbed globally in `next-runtime-stubs.ts` and resolves
 * to `admin-1`; nothing here needs to mock it.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as UploadModule from './upload-day-photos';

const uploadFile = mock().mockResolvedValue({ fileKey: 'k' });
mock.module('@/shared/api/s3-storage-api', () => ({
  privateStorage: { uploadFile, deleteFile: mock() },
}));

let uploadDayPhotos: typeof UploadModule.uploadDayPhotos;

beforeAll(async () => {
  ({ uploadDayPhotos } = await import('./upload-day-photos'));
});

const dayEntryUpsert = mock();
const photoCount = mock();
const photoCreate = mock();
Object.defineProperty(prisma, 'dayEntry', {
  value: { upsert: dayEntryUpsert },
  writable: true,
  configurable: true,
});
Object.defineProperty(prisma, 'dayPhoto', {
  value: { count: photoCount, create: photoCreate },
  writable: true,
  configurable: true,
});

const input = { localDate: '2026-08-22', todayKey: '2026-08-23' };

function jpeg(name = 'a.jpg', bytes = 1000) {
  return new File([new Uint8Array(bytes)], name, { type: 'image/jpeg' });
}

beforeEach(() => {
  uploadFile.mockClear();
  dayEntryUpsert.mockReset().mockResolvedValue({ id: 'entry-1' });
  photoCount.mockReset().mockResolvedValue(0);
  photoCreate.mockReset().mockImplementation(async ({ data }) => ({
    id: 'photo-1',
    caption: null,
    position: data.position,
    mimeType: data.mimeType,
    size: data.size,
  }));
});

describe('uploadDayPhotos', () => {
  it('writes under the day prefix in the private bucket', async () => {
    const res = await uploadDayPhotos(input, [jpeg()]);

    expect(res.success).toBe(true);
    const key = (uploadFile.mock.calls[0]?.[0] as { fileKey: string } | undefined)
      ?.fileKey;
    expect(key).toStartWith('users/admin-1/health/days/2026-08-22/');
  });

  it('creates the entry when the day has none yet', async () => {
    await uploadDayPhotos(input, [jpeg()]);
    expect(dayEntryUpsert).toHaveBeenCalled();
  });

  it('refuses an SVG', async () => {
    const svg = new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' });
    const res = await uploadDayPhotos(input, [svg]);

    expect(res.success).toBe(false);
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('counts photos already stored against the per-day ceiling', async () => {
    photoCount.mockResolvedValue(5);
    const res = await uploadDayPhotos(input, [jpeg()]);

    expect(res.success).toBe(false);
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('refuses a future day', async () => {
    const res = await uploadDayPhotos(
      { localDate: '2026-08-24', todayKey: '2026-08-23' },
      [jpeg()]
    );

    expect(res.success).toBe(false);
    expect(uploadFile).not.toHaveBeenCalled();
  });
});
