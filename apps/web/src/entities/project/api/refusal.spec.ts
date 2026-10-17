/**
 * The owner's project actions refuse a signed-in non-owner before any read or
 * write. The guard sits above `try` (AGENTS §8), so each call rejects rather
 * than returning an envelope, and Prisma is never reached. Prisma is replaced
 * at the delegate, as in `get-admin-project-options.spec.ts`.
 */
import type { ProjectFromValues } from '@byte-of-me/contracts/project';
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

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

const create = mock();
const update = mock();
const remove = mock();
const findFirst = mock();
const findMany = mock();
const count = mock();
const transaction = mock();
const mocks = [create, update, remove, findFirst, findMany, count, transaction];

const originalProject = Object.getOwnPropertyDescriptor(prisma, 'project');
const originalTransaction = Object.getOwnPropertyDescriptor(
  prisma,
  '$transaction'
);
Object.defineProperty(prisma, 'project', {
  value: { create, update, delete: remove, findFirst, findMany, count },
  writable: true,
  configurable: true,
});
Object.defineProperty(prisma, '$transaction', {
  value: transaction,
  writable: true,
  configurable: true,
});

const PROJECT_INPUT: ProjectFromValues = {
  slug: 'my-portfolio',
  isPublished: true,
  translations: [{ language: 'en', title: 'Portfolio', description: '' }],
};

beforeEach(() => {
  setTestUser({ id: 'user-2', role: 'USER' });
});

afterEach(() => {
  resetTestUser();
  for (const fn of mocks) fn.mockClear();
});

afterAll(() => {
  if (originalProject)
    Object.defineProperty(prisma, 'project', originalProject);
  if (originalTransaction)
    Object.defineProperty(prisma, '$transaction', originalTransaction);
});

describe('project actions refuse a non-owner', () => {
  it('createProject rejects and creates nothing', async () => {
    const { createProject } = await import('./create-project');

    await expect(createProject(PROJECT_INPUT)).rejects.toThrow('Unauthorized');
    expect(create).not.toHaveBeenCalled();
  });

  it('updateProject rejects before it opens a transaction', async () => {
    const { updateProject } = await import('./update-project');

    await expect(updateProject('p1', PROJECT_INPUT)).rejects.toThrow(
      'Unauthorized'
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it('deleteProject rejects and deletes nothing', async () => {
    const { deleteProject } = await import('./delete-project');

    await expect(deleteProject('p1')).rejects.toThrow('Unauthorized');
    expect(remove).not.toHaveBeenCalled();
  });

  it('getAdminProjectById rejects before it reads', async () => {
    const { getAdminProjectById } = await import('./get-admin-project-by-id');

    await expect(getAdminProjectById('p1')).rejects.toThrow('Unauthorized');
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('getPaginatedAdminProjects rejects before it reads', async () => {
    const { getPaginatedAdminProjects } = await import(
      './get-paginated-admin-projects'
    );

    await expect(getPaginatedAdminProjects()).rejects.toThrow('Unauthorized');
    expect(findMany).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
  });
});
