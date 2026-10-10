/**
 * The admin list stays narrow: its query selects each translation's columns
 * without `details`, so a list row can never carry a stored body. The editor
 * loads the full row by id instead. The Prisma delegate is replaced with a fake
 * that records the query arguments; no database is touched.
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

import { getPaginatedAdminFeaturedWorks } from './get-paginated-admin-featured-works';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

const findMany = mock(async (_args: unknown) => []);
const count = mock(async (_args: unknown) => 0);

const original = Object.getOwnPropertyDescriptor(prisma, 'featuredWork');
Object.defineProperty(prisma, 'featuredWork', {
  value: { findMany, count },
  writable: true,
  configurable: true,
});

const logError = spyOn(logger, 'error').mockImplementation(() => {});

beforeEach(() => {
  findMany.mockClear();
  count.mockClear();
  logError.mockClear();
});

afterAll(() => {
  if (original) Object.defineProperty(prisma, 'featuredWork', original);
  else Reflect.deleteProperty(prisma, 'featuredWork');
  logError.mockRestore();
  resetTestUser();
});

type ListArgs = {
  where: { userId: string };
  include: {
    translations: { select: Record<string, boolean>; orderBy: unknown };
  };
};

describe('getPaginatedAdminFeaturedWorks', () => {
  it('selects each translation without its details body', async () => {
    const res = await getPaginatedAdminFeaturedWorks();

    expect(res.success).toBe(true);
    const args = findMany.mock.calls[0]?.[0] as ListArgs;
    expect(Object.keys(args.include.translations.select).sort()).toEqual([
      'description',
      'id',
      'language',
      'title',
    ]);
    expect(args.include.translations.select.details).toBeUndefined();
  });

  it('scopes the list to the signed-in owner', async () => {
    await getPaginatedAdminFeaturedWorks();

    const args = findMany.mock.calls[0]?.[0] as ListArgs;
    expect(args.where).toEqual({ userId: 'admin-1' });
  });

  it('gives a non-admin the failure envelope without querying', async () => {
    setTestUser({ id: 'reader-1', role: 'USER' });
    try {
      const res = await getPaginatedAdminFeaturedWorks();

      expect(res.success).toBe(false);
      expect(findMany).not.toHaveBeenCalled();
    } finally {
      resetTestUser();
    }
  });
});
