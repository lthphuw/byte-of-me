/**
 * A non-admin caller is refused by every admin tag action before any read or
 * write. The guard sits above `try`, so the refusal rejects the call instead of
 * coming back as an envelope. Prisma is replaced whole, so a leaked query shows.
 */
import type { TagFormValues } from '@byte-of-me/contracts/tag';
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

import type * as TagActions from './index';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

const tagDelegate = {
  findUnique: mock<(args: unknown) => Promise<unknown>>(),
  findMany: mock<(args: unknown) => Promise<unknown>>(),
  count: mock<(args: unknown) => Promise<number>>(),
  create: mock<(args: unknown) => Promise<unknown>>(),
  update: mock<(args: unknown) => Promise<unknown>>(),
  delete: mock<(args: unknown) => Promise<unknown>>(),
};

const originalTag = Object.getOwnPropertyDescriptor(prisma, 'tag');

let actions: typeof TagActions;

beforeAll(async () => {
  Object.defineProperty(prisma, 'tag', {
    value: tagDelegate,
    writable: true,
    configurable: true,
  });
  actions = await import('./index');
});

beforeEach(() => {
  setTestUser({ id: 'user-2', role: 'USER', email: 'visitor@example.com' });
  for (const fn of Object.values(tagDelegate)) fn.mockReset();
});

afterAll(() => {
  if (originalTag) Object.defineProperty(prisma, 'tag', originalTag);
  resetTestUser();
});

const tagValues: TagFormValues = {
  slug: 'react',
  translations: [{ language: 'en', name: 'React' }],
};

const refusedCalls: Array<[string, () => Promise<unknown>]> = [
  ['createTag', () => actions.createTag(tagValues)],
  ['updateTag', () => actions.updateTag('tag-1', tagValues)],
  ['deleteTag', () => actions.deleteTag('tag-1')],
  ['getAdminTagById', () => actions.getAdminTagById('tag-1')],
  ['getPaginatedAdminTags', () => actions.getPaginatedAdminTags(1, 12)],
];

describe('tag actions refuse a non-admin caller', () => {
  it.each(refusedCalls)(
    '%s rejects before touching the database',
    async (_name, call) => {
      await expect(call()).rejects.toThrow('Unauthorized');

      for (const fn of Object.values(tagDelegate)) {
        expect(fn).not.toHaveBeenCalled();
      }
    }
  );
});
