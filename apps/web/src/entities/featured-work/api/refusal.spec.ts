/**
 * The owner's featured-work mutations refuse a signed-in non-owner before any
 * read or write. The guard sits above `try` (AGENTS §8), so each call rejects
 * rather than returning an envelope, and Prisma is never reached. Prisma is
 * replaced at the delegate, as in `get-admin-project-options.spec.ts`.
 */
import { prisma } from '@byte-of-me/db';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from 'bun:test';

import type { FeaturedWorkFormValues } from '@/entities/featured-work/model/featured-work-schema';
import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

const create = mock();
const aggregate = mock();
const update = mock();
const remove = mock();
const findFirst = mock();
const findMany = mock();
const transaction = mock();
const mocks = [
  create,
  aggregate,
  update,
  remove,
  findFirst,
  findMany,
  transaction,
];

const originalFeaturedWork = Object.getOwnPropertyDescriptor(
  prisma,
  'featuredWork'
);
const originalTransaction = Object.getOwnPropertyDescriptor(
  prisma,
  '$transaction'
);
Object.defineProperty(prisma, 'featuredWork', {
  value: {
    create,
    aggregate,
    update,
    delete: remove,
    findFirst,
    findMany,
  },
  writable: true,
  configurable: true,
});
Object.defineProperty(prisma, '$transaction', {
  value: transaction,
  writable: true,
  configurable: true,
});

const WORK_INPUT: FeaturedWorkFormValues = {
  translations: [{ language: 'en', title: 'Faster export' }],
};

beforeEach(() => {
  setTestUser({ id: 'user-2', role: 'USER' });
});

afterEach(() => {
  resetTestUser();
  for (const fn of mocks) fn.mockClear();
});

afterAll(() => {
  if (originalFeaturedWork)
    Object.defineProperty(prisma, 'featuredWork', originalFeaturedWork);
  if (originalTransaction)
    Object.defineProperty(prisma, '$transaction', originalTransaction);
});

describe('featured-work mutations refuse a non-owner', () => {
  it('createFeaturedWork rejects and creates nothing', async () => {
    const { createFeaturedWork } = await import('./create-featured-work');

    await expect(createFeaturedWork(WORK_INPUT)).rejects.toThrow(
      'Unauthorized'
    );
    expect(aggregate).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('updateFeaturedWork rejects before it opens a transaction', async () => {
    const { updateFeaturedWork } = await import('./update-featured-work');

    await expect(updateFeaturedWork('w1', WORK_INPUT)).rejects.toThrow(
      'Unauthorized'
    );
    expect(transaction).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('deleteFeaturedWork rejects and deletes nothing', async () => {
    const { deleteFeaturedWork } = await import('./delete-featured-work');

    await expect(deleteFeaturedWork('w1')).rejects.toThrow('Unauthorized');
    expect(findFirst).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('reorderFeaturedWork rejects before reading the list', async () => {
    const { reorderFeaturedWork } = await import('./reorder-featured-work');

    await expect(reorderFeaturedWork('w1', 'up')).rejects.toThrow(
      'Unauthorized'
    );
    expect(findMany).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });
});
