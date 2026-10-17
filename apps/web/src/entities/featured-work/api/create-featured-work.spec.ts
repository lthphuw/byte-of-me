/**
 * `createFeaturedWork` saves the demo pair with the work in one write, from the
 * array order, and only for media the admin owns. Prisma's delegates are replaced
 * with in-memory fakes; no database is touched.
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

import { createFeaturedWork } from './create-featured-work';

import { resetTestUser } from '@/shared/lib/auth/set-test-user.test-helper';

const aggregate = mock(async (_args: unknown) => ({ _max: { sortOrder: 2 } }));
const create = mock(async (_args: unknown) => ({ id: 'fw-new' }));
type CountArgs = {
  where: { userId: string; id: { in: string[] }; OR: unknown[] };
};
let ownedCount: (ids: string[]) => number = (ids) => ids.length;
const count = mock(async (args: CountArgs) => ownedCount(args.where.id.in));

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

const input = (
  media?: FeaturedWorkFormValues['media'],
  links?: FeaturedWorkFormValues['links']
): FeaturedWorkFormValues => ({
  translations: [{ language: 'en', title: 'INT8 vs FP16' }],
  media,
  links,
});

type CreateArgs = {
  data: {
    media: {
      create: Array<{
        mediaId: string;
        sortOrder: number;
        label: string | null;
      }>;
    };
  };
};
const written = () =>
  (create.mock.calls[0]?.[0] as CreateArgs).data.media.create;

type LinkArgs = {
  data: {
    links: {
      create: Array<{ url: string; sortOrder: number; label: string | null }>;
    };
  };
};
const linkWrites = () =>
  (create.mock.calls[0]?.[0] as LinkArgs).data.links.create;

describe('createFeaturedWork links', () => {
  const PR = 'https://github.com/roboflow/rf-detr/pull/512';

  it('writes the links with the work: position from order, label trimmed, blank as null', async () => {
    const res = await createFeaturedWork(
      input(undefined, [
        { url: PR, label: ' INT8 ' },
        { url: 'https://example.com/post', label: '   ' },
      ])
    );

    expect(res.success).toBe(true);
    expect(linkWrites()).toEqual([
      { url: PR, sortOrder: 0, label: 'INT8' },
      { url: 'https://example.com/post', sortOrder: 1, label: null },
    ]);
  });

  it('writes no links when the form omits them', async () => {
    const res = await createFeaturedWork(input());

    expect(res.success).toBe(true);
    expect(linkWrites()).toEqual([]);
  });

  it('refuses a link that is not http(s), and creates nothing', async () => {
    const res = await createFeaturedWork(
      input(undefined, [{ url: 'javascript:alert(1)', label: null }])
    );

    expect(res.success).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });
});

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

  it('refuses media the admin does not own, and creates nothing', async () => {
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
    const twice = await createFeaturedWork(
      input([{ mediaId: 'a' }, { mediaId: 'a' }])
    );

    expect(three.success).toBe(false);
    expect(twice.success).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('createFeaturedWork publishing and body', () => {
  it('writes no publish flag and no description: a work is always published', async () => {
    const res = await createFeaturedWork(input());

    expect(res.success).toBe(true);
    const data = (
      create.mock.calls[0]?.[0] as { data: Record<string, unknown> }
    ).data;
    expect(Object.keys(data)).not.toContain('isPublished');
    const translations = data.translations as {
      create: Array<Record<string, unknown>>;
    };
    expect(Object.keys(translations.create[0] ?? {})).not.toContain(
      'description'
    );
  });
});
