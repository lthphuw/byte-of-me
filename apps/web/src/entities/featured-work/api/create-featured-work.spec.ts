/**
 * `createFeaturedWork` saves the demo pair with the work in one write, from the
 * array order, and only for media the admin owns. Prisma's delegates are replaced
 * with in-memory fakes; no database is touched.
 */
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { afterAll, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';

import { createFeaturedWork } from './create-featured-work';

import type { FeaturedWorkFormValues } from '@/entities/featured-work/model/featured-work-schema';
import { resetTestUser } from '@/shared/lib/auth/set-test-user.test-helper';

const aggregate = mock(async (_args: unknown) => ({ _max: { sortOrder: 2 } }));
const create = mock(async (_args: unknown) => ({ id: 'fw-new' }));
type CountArgs = { where: { userId: string; id: { in: string[] }; OR: unknown[] } };
let ownedCount: (ids: string[]) => number = (ids) => ids.length;
const count = mock(async (args: CountArgs) =>
  ownedCount(args.where.id.in)
);

const originals = {
  featuredWork: Object.getOwnPropertyDescriptor(prisma, 'featuredWork'),
  media: Object.getOwnPropertyDescriptor(prisma, 'media'),
};
Object.defineProperty(prisma, 'featuredWork', {
  value: { aggregate, create },
  writable: true,
  configurable: true,
});
Object.defineProperty(prisma, 'media', {
  value: { count },
  writable: true,
  configurable: true,
});
const logError = spyOn(logger, 'error').mockImplementation(() => {});

beforeEach(() => {
  aggregate.mockClear();
  create.mockClear();
  count.mockClear();
  logError.mockClear();
  ownedCount = (ids) => ids.length;
});

afterAll(() => {
  for (const [key, original] of Object.entries(originals)) {
    if (original) Object.defineProperty(prisma, key, original);
    else Reflect.deleteProperty(prisma, key);
  }
  logError.mockRestore();
  resetTestUser();
});

const input = (media?: FeaturedWorkFormValues['media']): FeaturedWorkFormValues => ({
  isPublished: true,
  url: '',
  translations: [{ language: 'en', title: 'INT8 vs FP16' }],
  media,
});

type CreateArgs = {
  data: { media: { create: Array<{ mediaId: string; sortOrder: number; label: string | null }> } };
};
const written = () => (create.mock.calls[0]?.[0] as CreateArgs).data.media.create;

describe('createFeaturedWork demo media', () => {
  it('writes the pair with the work: slot from position, label trimmed, blank as null', async () => {
    const res = await createFeaturedWork(
      input([
        { mediaId: 'm-fp16', label: ' FP16 ' },
        { mediaId: 'm-int8', label: '   ' },
      ])
    );

    expect(res.success).toBe(true);
    expect(written()).toEqual([
      { mediaId: 'm-fp16', sortOrder: 0, label: 'FP16' },
      { mediaId: 'm-int8', sortOrder: 1, label: null },
    ]);
  });

  it('writes an empty pair when media is omitted', async () => {
    const res = await createFeaturedWork(input());

    expect(res.success).toBe(true);
    expect(written()).toEqual([]);
    expect(count).not.toHaveBeenCalled();
  });

  it("refuses media the admin does not own, and creates nothing", async () => {
    ownedCount = () => 0;

    const res = await createFeaturedWork(input([{ mediaId: 'someone-elses' }]));

    expect(res).toEqual({ success: false, errorMsg: 'Media not found' });
    const where = (
      count.mock.calls[0]?.[0] as { where: { userId: string; OR: unknown[] } }
    ).where;
    expect(where.userId).toBe('admin-1');
    // Only a library image or an accepted video can fill a slot.
    expect(JSON.stringify(where.OR)).toContain('image/');
    expect(JSON.stringify(where.OR)).toContain('video/mp4');
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses more than two items and a repeated file', async () => {
    const three = await createFeaturedWork(
      input([{ mediaId: 'a' }, { mediaId: 'b' }, { mediaId: 'c' }])
    );
    const twice = await createFeaturedWork(input([{ mediaId: 'a' }, { mediaId: 'a' }]));

    expect(three.success).toBe(false);
    expect(twice.success).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });
});
