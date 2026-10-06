/**
 * `getAdminTagOptions` feeds two pickers (the blog form and the project
 * dialog) that used to read `getPaginatedAdminTags(1, 100)`, which
 * `clampPagination` silently cut to 50. What this defends: a flat
 * id/slug/name option per tag, an explicit row ceiling, and the admin gate.
 *
 * Prisma is replaced at the delegate, as in `get-paginated-public-blogs.spec.ts`;
 * the identity comes from the preload's auth stub.
 */
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';

import type * as GetAdminTagOptionsModule from './get-admin-tag-options';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';
import { ADMIN_OPTIONS_LIMIT } from '@/shared/lib/query/admin-list';

type FindManyArgs = {
  take: number;
  select: { translations: { select: object } };
};

const findMany = mock<(args: FindManyArgs) => Promise<unknown[]>>();
const originalTag = Object.getOwnPropertyDescriptor(prisma, 'tag');
Object.defineProperty(prisma, 'tag', {
  value: { findMany },
  writable: true,
  configurable: true,
});

const logError = spyOn(logger, 'error').mockImplementation(() => {});

let getAdminTagOptions: typeof GetAdminTagOptionsModule.getAdminTagOptions;

/** The one query the action ran. */
function queryArgs(): FindManyArgs {
  const args = findMany.mock.calls[0]?.[0];
  if (!args) throw new Error('the action never queried');
  return args;
}

beforeAll(async () => {
  ({ getAdminTagOptions } = await import('./get-admin-tag-options'));
});

beforeEach(() => {
  findMany.mockReset().mockResolvedValue([]);
  logError.mockClear();
});

afterEach(() => {
  resetTestUser();
});

afterAll(() => {
  if (originalTag) Object.defineProperty(prisma, 'tag', originalTag);
  logError.mockRestore();
});

describe('getAdminTagOptions', () => {
  it('returns id, slug and name and nothing else', async () => {
    findMany.mockResolvedValue([
      {
        id: 't1',
        slug: 'react',
        translations: [
          { language: 'vi', name: 'Thư viện React' },
          { language: 'en', name: 'React' },
        ],
      },
    ]);

    const res = await getAdminTagOptions();

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data).toStrictEqual([
      { id: 't1', slug: 'react', name: 'React' },
    ]);
  });

  it('asks Prisma for the three fields only and bounds the read above the old silent 50', async () => {
    await getAdminTagOptions();

    const { select, take } = queryArgs();
    expect(Object.keys(select).sort()).toEqual(['id', 'slug', 'translations']);
    expect(Object.keys(select.translations.select).sort()).toEqual([
      'language',
      'name',
    ]);
    expect(take).toBe(ADMIN_OPTIONS_LIMIT);
    expect(take).toBeGreaterThan(50);
  });

  it('falls back to another locale, then to the slug, when the name is missing', async () => {
    findMany.mockResolvedValue([
      {
        id: 't1',
        slug: 'only-vietnamese',
        translations: [{ language: 'vi', name: 'Chỉ tiếng Việt' }],
      },
      { id: 't2', slug: 'no-translations', translations: [] },
    ]);

    const res = await getAdminTagOptions();

    if (!res.success) throw new Error('unreachable');
    expect(res.data.map((tag) => tag.name)).toEqual([
      'Chỉ tiếng Việt',
      'no-translations',
    ]);
  });

  it('refuses a non-admin caller without touching the database', async () => {
    setTestUser({ id: 'user-2', role: 'USER', email: 'visitor@example.com' });

    const res = await getAdminTagOptions();

    expect(res.success).toBe(false);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('reports a failed query through errorMsg and logs it', async () => {
    findMany.mockRejectedValue(new Error('connection refused'));

    const res = await getAdminTagOptions();

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBe('connection refused');
    expect(logError).toHaveBeenCalledTimes(1);
  });
});
