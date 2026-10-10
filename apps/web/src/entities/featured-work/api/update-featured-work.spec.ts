/**
 * `updateFeaturedWork` rewrites every translation (`deleteMany` + `create`), so
 * the `details` it writes is whatever the caller sent. An omitted `details` is
 * stored as null: a caller that does not send the body clears it. That is
 * deliberate and pinned here, so a form that drops the field cannot wipe a body
 * unnoticed. The demo pair is the opposite, also pinned: an omitted `media` keeps
 * the stored pair and only an explicit `[]` clears it. The transaction runs
 * against a fake `tx`; no database is touched.
 */
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';

import { updateFeaturedWork } from './update-featured-work';

import type { FeaturedWorkFormValues } from '@/entities/featured-work/model/featured-work-schema';
import { resetTestUser } from '@/shared/lib/auth/set-test-user.test-helper';

const DETAILS = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'How it was done.' }],
    },
  ],
});

const findFirst = mock(async (_args: unknown) => ({ id: 'fw-1' }));
const update = mock(async (_args: unknown) => ({ id: 'fw-1' }));
/** Every write to the pair, in the order the transaction made it. */
const mediaWrites: string[] = [];
const deleteMany = mock(async (_args: unknown) => {
  mediaWrites.push('deleteMany');
  return { count: 0 };
});
const createMany = mock(async (_args: unknown) => {
  mediaWrites.push('createMany');
  return { count: 0 };
});
type MediaRow = { id: string; userId: string; mimeType: string };
type MimeFilter = { mimeType: { startsWith?: string; in?: string[] } };
type CountArgs = {
  where: { userId: string; id: { in: string[] }; OR: MimeFilter[] };
};
/** The media table the fake counts over; reset to the admin's own pair per test. */
let library: MediaRow[] = [];
const ownImage = (id: string): MediaRow => ({ id, userId: 'admin-1', mimeType: 'image/webp' });
// Honours every clause of the real filter, so a row the query would not match is not counted.
const count = mock(
  async ({ where }: CountArgs) =>
    library.filter(
      (row) =>
        where.id.in.includes(row.id) &&
        row.userId === where.userId &&
        where.OR.some(
          ({ mimeType }) =>
            (mimeType.startsWith !== undefined &&
              row.mimeType.startsWith(mimeType.startsWith)) ||
            (mimeType.in?.includes(row.mimeType) ?? false)
        )
    ).length
);

const originalTransaction = Object.getOwnPropertyDescriptor(
  prisma,
  '$transaction'
);
Object.defineProperty(prisma, '$transaction', {
  value: (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      featuredWork: { findFirst, update },
      featuredWorkMedia: { deleteMany, createMany },
      media: { count },
    }),
  writable: true,
  configurable: true,
});

const logError = spyOn(logger, 'error').mockImplementation(() => {});

beforeEach(() => {
  findFirst.mockClear();
  update.mockClear();
  deleteMany.mockClear();
  createMany.mockClear();
  count.mockClear();
  mediaWrites.length = 0;
  library = [ownImage('m-fp16'), ownImage('m-int8')];
  logError.mockClear();
});

afterAll(() => {
  if (originalTransaction) {
    Object.defineProperty(prisma, '$transaction', originalTransaction);
  } else {
    Reflect.deleteProperty(prisma, '$transaction');
  }
  logError.mockRestore();
  resetTestUser();
});

type UpdateArgs = {
  data: {
    translations: {
      deleteMany: Record<string, never>;
      create: Array<{ language: string; details: string | null }>;
    };
  };
};

function writtenTranslations(): UpdateArgs['data']['translations']['create'] {
  const args = update.mock.calls[0]?.[0] as UpdateArgs;
  return args.data.translations.create;
}

const input = (
  translations: FeaturedWorkFormValues['translations']
): FeaturedWorkFormValues => ({ isPublished: true, url: '', translations });

describe('updateFeaturedWork details', () => {
  it('stores a translation sent without details as null, clearing any stored body', async () => {
    const res = await updateFeaturedWork(
      'fw-1',
      input([{ language: 'en', title: 'INT8 quantization' }])
    );

    expect(res.success).toBe(true);
    expect(writtenTranslations()).toEqual([
      expect.objectContaining({ language: 'en', details: null }),
    ]);
  });

  it('stores the details a caller sends', async () => {
    await updateFeaturedWork(
      'fw-1',
      input([{ language: 'en', title: 'INT8 quantization', details: DETAILS }])
    );

    expect(writtenTranslations()).toEqual([
      expect.objectContaining({ language: 'en', details: DETAILS }),
    ]);
  });
});

const pair = [
  { mediaId: 'm-fp16', label: ' FP16 ' },
  { mediaId: 'm-int8', label: '' },
];

describe('updateFeaturedWork demo media', () => {
  it('keeps the stored pair when the caller omits media, and still saves the rest', async () => {
    const res = await updateFeaturedWork('fw-1', input([{ language: 'en', title: 'A' }]));

    expect(res.success).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
    expect(deleteMany).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
  });

  it('clears the pair when the caller sends an empty array', async () => {
    const res = await updateFeaturedWork('fw-1', {
      ...input([{ language: 'en', title: 'A' }]),
      media: [],
    });

    expect(res.success).toBe(true);
    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(deleteMany.mock.calls[0]?.[0]).toEqual({ where: { featuredWorkId: 'fw-1' } });
    expect(createMany).not.toHaveBeenCalled();
  });

  it('replaces the pair with the sent one: slot from position, label trimmed, blank as null', async () => {
    const res = await updateFeaturedWork('fw-1', {
      ...input([{ language: 'en', title: 'A' }]),
      media: pair,
    });

    expect(res.success).toBe(true);
    // Delete first: a swap of the two slots would otherwise hit both unique keys.
    expect(mediaWrites).toEqual(['deleteMany', 'createMany']);
    expect(createMany.mock.calls[0]?.[0]).toEqual({
      data: [
        { featuredWorkId: 'fw-1', mediaId: 'm-fp16', sortOrder: 0, label: 'FP16' },
        { featuredWorkId: 'fw-1', mediaId: 'm-int8', sortOrder: 1, label: null },
      ],
    });
  });

  it("refuses media the admin does not own, and writes nothing", async () => {
    library = [ownImage('m-fp16'), { ...ownImage('m-int8'), userId: 'someone-else' }];

    const res = await updateFeaturedWork('fw-1', {
      ...input([{ language: 'en', title: 'A' }]),
      media: pair,
    });

    expect(res).toEqual({ success: false, errorMsg: 'Media not found' });
    const where = (count.mock.calls[0]?.[0] as CountArgs).where;
    expect(where.userId).toBe('admin-1');
    expect(where.id.in).toEqual(['m-fp16', 'm-int8']);
    expect(update).not.toHaveBeenCalled();
    expect(mediaWrites).toEqual([]);
  });

  it('refuses a PDF in the pair, and writes nothing', async () => {
    library = [ownImage('m-fp16'), { ...ownImage('m-int8'), mimeType: 'application/pdf' }];

    const res = await updateFeaturedWork('fw-1', {
      ...input([{ language: 'en', title: 'A' }]),
      media: pair,
    });

    expect(res).toEqual({ success: false, errorMsg: 'Media not found' });
    expect(update).not.toHaveBeenCalled();
    expect(mediaWrites).toEqual([]);
  });

  it('accepts the admin\'s own image and mp4', async () => {
    library = [ownImage('m-fp16'), { ...ownImage('m-int8'), mimeType: 'video/mp4' }];

    const res = await updateFeaturedWork('fw-1', {
      ...input([{ language: 'en', title: 'A' }]),
      media: pair,
    });

    expect(res.success).toBe(true);
    expect(mediaWrites).toEqual(['deleteMany', 'createMany']);
  });

  it('refuses a third item or the same file twice before opening a transaction', async () => {
    const three = await updateFeaturedWork('fw-1', {
      ...input([{ language: 'en', title: 'A' }]),
      media: [{ mediaId: 'a' }, { mediaId: 'b' }, { mediaId: 'c' }],
    });
    const twice = await updateFeaturedWork('fw-1', {
      ...input([{ language: 'en', title: 'A' }]),
      media: [{ mediaId: 'a' }, { mediaId: 'a' }],
    });

    expect(three.success).toBe(false);
    expect(twice.success).toBe(false);
    expect(findFirst).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
