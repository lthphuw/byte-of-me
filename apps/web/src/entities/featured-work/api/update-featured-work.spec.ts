/**
 * `updateFeaturedWork` rewrites every translation: an omitted `details` is stored as null (pinned,
 * so a form dropping the field cannot wipe a body unnoticed); an omitted `media` keeps the stored
 * pair and only `[]` clears it. Runs against a fake `tx`, no database.
 */
import type { FeaturedWorkFormValues } from '@byte-of-me/contracts/featured-work';
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
const ownImage = (id: string): MediaRow => ({
  id,
  userId: 'admin-1',
  mimeType: 'image/webp',
});
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
      featuredWorkLink: { deleteMany: linkDeleteMany, createMany: linkCreateMany },
      media: { count },
    }),
  writable: true,
  configurable: true,
});

/** Every write to the links, in order, and the rows the last `createMany` was given. */
const linkWrites: string[] = [];
let linkRows: unknown[] = [];
const linkDeleteMany = mock(async (_args: unknown) => {
  linkWrites.push('deleteMany');
  return { count: 0 };
});
const linkCreateMany = mock(async (args: { data: unknown[] }) => {
  linkWrites.push('createMany');
  linkRows = args.data;
  return { count: args.data.length };
});

const logError = spyOn(logger, 'error').mockImplementation(() => {});

beforeEach(() => {
  findFirst.mockClear();
  update.mockClear();
  deleteMany.mockClear();
  createMany.mockClear();
  linkDeleteMany.mockClear();
  linkCreateMany.mockClear();
  linkWrites.length = 0;
  linkRows = [];
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
  translations: FeaturedWorkFormValues['translations'],
  links?: FeaturedWorkFormValues['links']
): FeaturedWorkFormValues => ({ translations, links });

const TITLE = [{ language: 'en', title: 'INT8 quantization' }];
const PR = 'https://github.com/roboflow/rf-detr/pull/512';

describe('updateFeaturedWork links', () => {
  it('keeps the stored links when the caller omits them', async () => {
    const res = await updateFeaturedWork('fw-1', input(TITLE));

    expect(res.success).toBe(true);
    expect(linkWrites).toEqual([]);
  });

  it('replaces the links with the sent list: position from order, label trimmed', async () => {
    const res = await updateFeaturedWork(
      'fw-1',
      input(TITLE, [
        { url: PR, label: ' INT8 ' },
        { url: 'https://example.com/post', label: '' },
      ])
    );

    expect(res.success).toBe(true);
    expect(linkWrites).toEqual(['deleteMany', 'createMany']);
    expect(linkRows).toEqual([
      { url: PR, label: 'INT8', sortOrder: 0, featuredWorkId: 'fw-1' },
      {
        url: 'https://example.com/post',
        label: null,
        sortOrder: 1,
        featuredWorkId: 'fw-1',
      },
    ]);
  });

  it('clears the links when [] is sent, without creating any', async () => {
    const res = await updateFeaturedWork('fw-1', input(TITLE, []));

    expect(res.success).toBe(true);
    expect(linkWrites).toEqual(['deleteMany']);
  });

  it('refuses a link that is not http(s), and writes nothing', async () => {
    const res = await updateFeaturedWork(
      'fw-1',
      input(TITLE, [{ url: 'javascript:alert(1)', label: null }])
    );

    expect(res.success).toBe(false);
    expect(update).not.toHaveBeenCalled();
    expect(linkWrites).toEqual([]);
  });
});

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

describe('updateFeaturedWork publishing and body', () => {
  it('writes no publish flag and no description: a work is always published', async () => {
    const res = await updateFeaturedWork(
      'fw-1',
      input([{ language: 'en', title: 'INT8 quantization' }])
    );

    expect(res.success).toBe(true);
    const data = (
      update.mock.calls[0]?.[0] as { data: Record<string, unknown> }
    ).data;
    expect(Object.keys(data)).not.toContain('isPublished');
    expect(Object.keys(writtenTranslations()[0] ?? {})).not.toContain(
      'description'
    );
  });
});

describe('updateFeaturedWork demo media', () => {
  it('keeps the stored pair when the caller omits media, and still saves the rest', async () => {
    const res = await updateFeaturedWork(
      'fw-1',
      input([{ language: 'en', title: 'A' }])
    );

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
    expect(deleteMany.mock.calls[0]?.[0]).toEqual({
      where: { featuredWorkId: 'fw-1' },
    });
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
        {
          featuredWorkId: 'fw-1',
          mediaId: 'm-fp16',
          sortOrder: 0,
          label: 'FP16',
        },
        {
          featuredWorkId: 'fw-1',
          mediaId: 'm-int8',
          sortOrder: 1,
          label: null,
        },
      ],
    });
  });

  it('refuses media the admin does not own, and writes nothing', async () => {
    library = [
      ownImage('m-fp16'),
      { ...ownImage('m-int8'), userId: 'someone-else' },
    ];

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
    library = [
      ownImage('m-fp16'),
      { ...ownImage('m-int8'), mimeType: 'application/pdf' },
    ];

    const res = await updateFeaturedWork('fw-1', {
      ...input([{ language: 'en', title: 'A' }]),
      media: pair,
    });

    expect(res).toEqual({ success: false, errorMsg: 'Media not found' });
    expect(update).not.toHaveBeenCalled();
    expect(mediaWrites).toEqual([]);
  });

  it("accepts the admin's own image and mp4", async () => {
    library = [
      ownImage('m-fp16'),
      { ...ownImage('m-int8'), mimeType: 'video/mp4' },
    ];

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
