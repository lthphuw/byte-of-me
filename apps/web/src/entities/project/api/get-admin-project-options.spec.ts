/**
 * Defends the picker handoff: three fields only, an explicit row ceiling (not `clampPagination`'s
 * silent 50), and the admin gate. Prisma is replaced at the delegate, as in
 * `get-paginated-public-blogs.spec.ts`.
 */
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { ADMIN_OPTIONS_LIMIT } from '@byte-of-me/query';
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

import type * as GetAdminProjectOptionsModule from './get-admin-project-options';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

type FindManyArgs = {
  where: unknown;
  take: number;
  select: { translations: { select: object } };
};

const findMany = mock<(args: FindManyArgs) => Promise<unknown[]>>();
const originalProject = Object.getOwnPropertyDescriptor(prisma, 'project');
Object.defineProperty(prisma, 'project', {
  value: { findMany },
  writable: true,
  configurable: true,
});

const logError = spyOn(logger, 'error').mockImplementation(() => {});

let getAdminProjectOptions: typeof GetAdminProjectOptionsModule.getAdminProjectOptions;

/** The one query the action ran. */
function queryArgs(): FindManyArgs {
  const args = findMany.mock.calls[0]?.[0];
  if (!args) throw new Error('the action never queried');
  return args;
}

beforeAll(async () => {
  ({ getAdminProjectOptions } = await import('./get-admin-project-options'));
});

beforeEach(() => {
  findMany.mockReset().mockResolvedValue([]);
  logError.mockClear();
});

afterEach(() => {
  resetTestUser();
});

afterAll(() => {
  if (originalProject)
    Object.defineProperty(prisma, 'project', originalProject);
  logError.mockRestore();
});

describe('getAdminProjectOptions', () => {
  it('returns id, slug and title and nothing else', async () => {
    findMany.mockResolvedValue([
      {
        id: 'p1',
        slug: 'byte-of-me',
        translations: [
          { language: 'vi', title: 'Cổng thông tin' },
          { language: 'en', title: 'Portfolio' },
        ],
      },
    ]);

    const res = await getAdminProjectOptions();

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data).toStrictEqual([
      { id: 'p1', slug: 'byte-of-me', title: 'Portfolio' },
    ]);
  });

  it('asks Prisma for the three fields only, never a description', async () => {
    await getAdminProjectOptions();

    const { select } = queryArgs();
    expect(Object.keys(select).sort()).toEqual(['id', 'slug', 'translations']);
    expect(Object.keys(select.translations.select).sort()).toEqual([
      'language',
      'title',
    ]);
  });

  it('scopes to the signed-in owner and bounds the read above the old silent 50', async () => {
    await getAdminProjectOptions();

    const { where, take } = queryArgs();
    expect(where).toEqual({ userId: 'admin-1' });
    expect(take).toBe(ADMIN_OPTIONS_LIMIT);
    expect(take).toBeGreaterThan(50);
  });

  it('falls back to another locale, then to the slug, when the title is missing', async () => {
    findMany.mockResolvedValue([
      {
        id: 'p1',
        slug: 'only-vietnamese',
        translations: [{ language: 'vi', title: 'Chỉ tiếng Việt' }],
      },
      { id: 'p2', slug: 'no-translations', translations: [] },
    ]);

    const res = await getAdminProjectOptions();

    if (!res.success) throw new Error('unreachable');
    expect(res.data.map((project) => project.title)).toEqual([
      'Chỉ tiếng Việt',
      'no-translations',
    ]);
  });

  it('rejects a non-admin caller without touching the database', async () => {
    setTestUser({ id: 'user-2', role: 'USER', email: 'visitor@example.com' });

    await expect(getAdminProjectOptions()).rejects.toThrow('Unauthorized');
    expect(findMany).not.toHaveBeenCalled();
  });

  it('reports a failed query through errorMsg and logs it', async () => {
    findMany.mockRejectedValue(new Error('connection refused'));

    const res = await getAdminProjectOptions();

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBe('connection refused');
    expect(logError).toHaveBeenCalledTimes(1);
  });
});
