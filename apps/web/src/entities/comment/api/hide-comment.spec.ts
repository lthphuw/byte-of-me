/**
 * `hideComment` lets a comment's author and the site owner hide it, and refuses
 * everyone else with the `forbidden` code. Prisma is replaced at the `comment`
 * delegate by an in-memory table that applies the `where` the action sends, so
 * each test asserts the stored row, not the arguments of a call. The identity
 * comes from the preload's auth stub; the default is the site owner.
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
  spyOn,
} from 'bun:test';

import type * as HideCommentModule from './hide-comment';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

type Row = { id: string; userId: string; isDeleted: boolean };
type UpdateManyArgs = {
  where: { id: string; userId?: string };
  data: { isDeleted: boolean };
};

const COMMENT_ID = 'cl9ebqhxk00003b600tymydho';
const AUTHOR_ID = 'user-author';

const rows = new Map<string, Row>();

const commentDelegate = {
  updateMany: async ({ where, data }: UpdateManyArgs) => {
    let count = 0;
    for (const row of rows.values()) {
      if (row.id !== where.id) continue;
      if (where.userId !== undefined && row.userId !== where.userId) continue;
      row.isDeleted = data.isDeleted;
      count += 1;
    }
    return { count };
  },
  // Looked up only when `updateMany` matched nothing, to tell a missing comment
  // from someone else's.
  findUnique: async ({ where }: { where: { id: string } }) => {
    for (const row of rows.values()) {
      if (row.id === where.id) return { id: row.id };
    }
    return null;
  },
};

const originalComment = Object.getOwnPropertyDescriptor(prisma, 'comment');
Object.defineProperty(prisma, 'comment', {
  value: commentDelegate,
  writable: true,
  configurable: true,
});

const logError = spyOn(logger, 'error').mockImplementation(() => {});

let hideComment: typeof HideCommentModule.hideComment;

beforeAll(async () => {
  ({ hideComment } = await import('./hide-comment'));
});

beforeEach(() => {
  rows.clear();
  rows.set(COMMENT_ID, { id: COMMENT_ID, userId: AUTHOR_ID, isDeleted: false });
  logError.mockClear();
});

afterEach(() => {
  resetTestUser();
});

afterAll(() => {
  if (originalComment) Object.defineProperty(prisma, 'comment', originalComment);
  logError.mockRestore();
});

const isHidden = () => rows.get(COMMENT_ID)?.isDeleted;

describe('hideComment', () => {
  it('lets the author hide their own comment', async () => {
    setTestUser({ id: AUTHOR_ID, role: 'USER', email: 'author@example.com' });

    const res = await hideComment(COMMENT_ID);

    expect(res.success).toBe(true);
    expect(isHidden()).toBe(true);
  });

  it('lets the site owner hide a comment they did not write', async () => {
    const res = await hideComment(COMMENT_ID);

    expect(res.success).toBe(true);
    expect(isHidden()).toBe(true);
  });

  it('refuses another visitor with the forbidden code and writes nothing', async () => {
    setTestUser({ id: 'user-other', role: 'USER', email: 'visitor@example.com' });

    const res = await hideComment(COMMENT_ID);

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorCode).toBe('forbidden');
    expect(isHidden()).toBe(false);
  });

  it('refuses an ADMIN role that is not the site owner', async () => {
    setTestUser({
      id: 'user-second-admin',
      role: 'ADMIN',
      email: 'second-admin@example.com',
    });

    const res = await hideComment(COMMENT_ID);

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorCode).toBe('forbidden');
    expect(isHidden()).toBe(false);
  });

  it('refuses an anonymous caller and reports it through errorMsg', async () => {
    setTestUser(null);

    const res = await hideComment(COMMENT_ID);

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBe('Unauthorized');
    expect(isHidden()).toBe(false);
  });
});
