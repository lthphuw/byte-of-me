/**
 * `postComment` is the one write a signed-in visitor can aim at any id. What is
 * defended: only a published blog takes a comment, a reply must point at a
 * visible comment on the same blog and stay within the depth cap, and a
 * refused comment never sends the owner a notification. Prisma's delegates are
 * replaced by an in-memory comment table; the mailer is a recording fake.
 */
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';
import * as nextServer from 'next/server';

import { postComment } from './post-comment';

import { mailer } from '@/shared/api';
import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

type Row = {
  id: string;
  blogId: string | null;
  parentId: string | null;
  isDeleted: boolean;
};

const BLOG_ID = 'cl9ebqhxk00003b600tymydho';
const OTHER_BLOG_ID = 'cl9ebqhxk00009b600tymydzz';

const comments = new Map<string, Row>();
let publishedBlogs: Set<string>;
let created: Record<string, unknown>[];

const blogFindFirst = mock(
  async ({ where }: { where: { id: string; isPublished: boolean } }) =>
    where.isPublished && publishedBlogs.has(where.id) ? { id: where.id } : null
);
const blogFindUniqueOrThrow = mock(async () => ({
  slug: 'a-post',
  translations: [{ language: 'en', title: 'A post' }],
}));
const commentFindUnique = mock(async ({ where }: { where: { id: string } }) => {
  const row = comments.get(where.id);
  return row
    ? { blogId: row.blogId, isDeleted: row.isDeleted, parentId: row.parentId }
    : null;
});
const commentCreate = mock(
  async ({ data }: { data: Record<string, unknown> }) => {
    created.push(data);
    return { id: 'new-comment', ...data };
  }
);
const upsert = mock(async () => ({ count: 1 }));
const deleteMany = mock(async () => ({ count: 0 }));

const original = {
  blog: Object.getOwnPropertyDescriptor(prisma, 'blog'),
  comment: Object.getOwnPropertyDescriptor(prisma, 'comment'),
  rateLimitHit: Object.getOwnPropertyDescriptor(prisma, 'rateLimitHit'),
};
const define = (name: string, value: unknown) =>
  Object.defineProperty(prisma, name, {
    value,
    writable: true,
    configurable: true,
  });

const sendMail = spyOn(mailer, 'sendMail').mockImplementation((async () => ({
  messageId: 'x',
})) as unknown as typeof mailer.sendMail);
const logError = spyOn(logger, 'error').mockImplementation(() => {});
spyOn(logger, 'info').mockImplementation(() => {});

// `after()` throws outside a request, so run its callback in place and keep the
// promise: a notification that would be sent is then visible to the test.
let deferred: Promise<unknown>[] = [];
const after = spyOn(nextServer, 'after').mockImplementation(((
  task: () => Promise<unknown>
) => {
  deferred.push(task());
}) as unknown as typeof nextServer.after);

/** A chain root <- ... of `length` comments on BLOG_ID; returns the leaf's id. */
function chain(length: number): string {
  let parentId: string | null = null;
  for (let i = 0; i < length; i += 1) {
    const id = `c${i}`;
    comments.set(id, { id, blogId: BLOG_ID, parentId, isDeleted: false });
    parentId = id;
  }
  return parentId as string;
}

beforeEach(() => {
  comments.clear();
  created = [];
  publishedBlogs = new Set([BLOG_ID]);
  deferred = [];
  sendMail.mockClear();
  logError.mockClear();
  define('blog', {
    findFirst: blogFindFirst,
    findUniqueOrThrow: blogFindUniqueOrThrow,
  });
  define('comment', { findUnique: commentFindUnique, create: commentCreate });
  define('rateLimitHit', { upsert, deleteMany });
  setTestUser({ id: 'user-1', role: 'USER', email: 'reader@example.com' });
});

afterEach(() => {
  resetTestUser();
});

afterAll(() => {
  for (const [name, descriptor] of Object.entries(original)) {
    if (descriptor) Object.defineProperty(prisma, name, descriptor);
  }
  sendMail.mockRestore();
  logError.mockRestore();
  after.mockRestore();
});

const settle = () => Promise.all(deferred);

describe('postComment', () => {
  it('stores a top-level comment on a published blog', async () => {
    const res = await postComment(BLOG_ID, 'Nice post');
    await settle();

    expect(res.success).toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(created).toEqual([
      {
        blogId: BLOG_ID,
        userId: 'user-1',
        parentId: null,
        content: 'Nice post',
      },
    ]);
  });

  it('refuses a comment on an unpublished or unknown blog, and sends no mail', async () => {
    publishedBlogs.clear();

    const res = await postComment(BLOG_ID, 'Nice post');
    await settle();

    expect(res).toEqual({ success: false, errorMsg: 'Blog not found' });
    expect(created).toHaveLength(0);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('accepts a reply to a visible comment on the same blog', async () => {
    const parentId = chain(1);

    const res = await postComment(BLOG_ID, 'Agreed', parentId);

    expect(res.success).toBe(true);
    expect(created[0]).toMatchObject({ parentId });
  });

  it('refuses a reply to a comment on another blog', async () => {
    publishedBlogs.add(OTHER_BLOG_ID);
    comments.set('foreign', {
      id: 'foreign',
      blogId: OTHER_BLOG_ID,
      parentId: null,
      isDeleted: false,
    });

    const res = await postComment(BLOG_ID, 'Hijack', 'foreign');
    await settle();

    expect(res).toEqual({ success: false, errorMsg: 'Comment not found' });
    expect(created).toHaveLength(0);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('refuses a reply to a hidden comment', async () => {
    comments.set('hidden', {
      id: 'hidden',
      blogId: BLOG_ID,
      parentId: null,
      isDeleted: true,
    });

    const res = await postComment(BLOG_ID, 'Hello?', 'hidden');

    expect(res.success).toBe(false);
    expect(created).toHaveLength(0);
  });

  it('refuses a reply to a comment that does not exist', async () => {
    const res = await postComment(BLOG_ID, 'Hello?', 'nope');

    expect(res).toEqual({ success: false, errorMsg: 'Comment not found' });
    expect(created).toHaveLength(0);
  });

  it('allows a reply at the depth cap and refuses the one below it', async () => {
    // Five ancestors above the new reply is the deepest allowed.
    const atCap = await postComment(BLOG_ID, 'Deep but fine', chain(5));
    expect(atCap.success).toBe(true);

    comments.clear();
    created = [];
    const pastCap = await postComment(BLOG_ID, 'Too deep', chain(6));

    expect(pastCap.success).toBe(false);
    expect(created).toHaveLength(0);
  });

  it('never leaks database text when the insert fails', async () => {
    commentCreate.mockRejectedValueOnce(
      new Error('Unique constraint failed on db.internal.example')
    );

    const res = await postComment(BLOG_ID, 'Nice post');

    expect(res).toEqual({ success: false, errorMsg: 'Failed to post comment' });
    expect(JSON.stringify(logError.mock.calls)).toContain(
      'db.internal.example'
    );
  });
});
