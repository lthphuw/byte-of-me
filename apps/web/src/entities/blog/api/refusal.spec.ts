/**
 * A non-admin caller is refused by every admin blog action before any read or
 * write. The guard sits above `try`, so the refusal rejects the call instead of
 * coming back as an envelope. Prisma is replaced whole, so a leaked query shows.
 */
import type { BlogFormValues } from '@byte-of-me/contracts/blog';
import { prisma } from '@byte-of-me/db';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from 'bun:test';

import type * as BlogActions from './index';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

const blogDelegate = {
  findFirstOrThrow: mock<(args: unknown) => Promise<unknown>>(),
  findMany: mock<(args: unknown) => Promise<unknown>>(),
  count: mock<(args: unknown) => Promise<number>>(),
  create: mock<(args: unknown) => Promise<unknown>>(),
  update: mock<(args: unknown) => Promise<unknown>>(),
  delete: mock<(args: unknown) => Promise<unknown>>(),
};
const transaction = mock<(fn: unknown) => Promise<unknown>>();

const originals = {
  blog: Object.getOwnPropertyDescriptor(prisma, 'blog'),
  transaction: Object.getOwnPropertyDescriptor(prisma, '$transaction'),
};

let actions: typeof BlogActions;

beforeAll(async () => {
  Object.defineProperty(prisma, 'blog', {
    value: blogDelegate,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(prisma, '$transaction', {
    value: transaction,
    writable: true,
    configurable: true,
  });
  actions = await import('./index');
});

beforeEach(() => {
  setTestUser({ id: 'user-2', role: 'USER', email: 'visitor@example.com' });
  for (const fn of Object.values(blogDelegate)) fn.mockReset();
  transaction.mockReset();
});

afterAll(() => {
  if (originals.blog) Object.defineProperty(prisma, 'blog', originals.blog);
  if (originals.transaction)
    Object.defineProperty(prisma, '$transaction', originals.transaction);
  resetTestUser();
});

const blogValues: BlogFormValues = {
  slug: 'hello-world',
  isPublished: false,
  translations: [],
};

const refusedCalls: Array<[string, () => Promise<unknown>]> = [
  ['createBlog', () => actions.createBlog(blogValues)],
  ['updateBlog', () => actions.updateBlog('blog-1', blogValues)],
  ['deleteBlog', () => actions.deleteBlog('blog-1')],
  ['getAdminBlogById', () => actions.getAdminBlogById('blog-1')],
  ['getPaginatedAdminBlogs', () => actions.getPaginatedAdminBlogs(1, 12)],
];

describe('blog actions refuse a non-admin caller', () => {
  it.each(refusedCalls)(
    '%s rejects before touching the database',
    async (_name, call) => {
      await expect(call()).rejects.toThrow('Unauthorized');

      for (const fn of Object.values(blogDelegate)) {
        expect(fn).not.toHaveBeenCalled();
      }
      expect(transaction).not.toHaveBeenCalled();
    }
  );
});
