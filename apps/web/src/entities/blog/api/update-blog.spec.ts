/**
 * `updateBlog` writes only the signed-in owner's post, and replaces its
 * translation rows only once that post has been updated. A body is stored as
 * the JSON string the `content` column holds. Prisma is replaced whole.
 */
import type { RichTextDoc } from '@byte-of-me/contracts';
import type { BlogFormValues } from '@byte-of-me/contracts/blog';
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

import type * as UpdateBlogModule from './update-blog';

import { resetTestUser } from '@/shared/lib/auth/set-test-user.test-helper';

const blogUpdate = mock<(args: unknown) => Promise<unknown>>();
const translationDeleteMany = mock<(args: unknown) => Promise<unknown>>();
const translationCreateMany = mock<(args: unknown) => Promise<unknown>>();
const transaction =
  mock<(fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>>();

const originals = {
  blog: Object.getOwnPropertyDescriptor(prisma, 'blog'),
  blogTranslation: Object.getOwnPropertyDescriptor(prisma, 'blogTranslation'),
  transaction: Object.getOwnPropertyDescriptor(prisma, '$transaction'),
};

const logError = spyOn(logger, 'error').mockImplementation(() => {});

let updateBlog: typeof UpdateBlogModule.updateBlog;

const body: RichTextDoc = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
};

const input: BlogFormValues = {
  slug: 'hello-world',
  isPublished: true,
  translations: [
    { language: 'en', title: 'Hello', description: 'A post', content: body },
  ],
};

beforeAll(async () => {
  Object.defineProperty(prisma, 'blog', {
    value: { update: blogUpdate },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(prisma, 'blogTranslation', {
    value: {
      deleteMany: translationDeleteMany,
      createMany: translationCreateMany,
    },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(prisma, '$transaction', {
    value: transaction,
    writable: true,
    configurable: true,
  });
  ({ updateBlog } = await import('./update-blog'));
});

beforeEach(() => {
  blogUpdate.mockReset().mockResolvedValue({ id: 'blog-1' });
  translationDeleteMany.mockReset().mockResolvedValue({ count: 1 });
  translationCreateMany.mockReset().mockResolvedValue({ count: 1 });
  transaction.mockReset().mockImplementation((fn) =>
    fn({
      blog: { update: blogUpdate },
      blogTranslation: {
        deleteMany: translationDeleteMany,
        createMany: translationCreateMany,
      },
    })
  );
  logError.mockClear();
});

afterEach(() => {
  resetTestUser();
});

afterAll(() => {
  if (originals.blog) Object.defineProperty(prisma, 'blog', originals.blog);
  if (originals.blogTranslation)
    Object.defineProperty(prisma, 'blogTranslation', originals.blogTranslation);
  if (originals.transaction)
    Object.defineProperty(prisma, '$transaction', originals.transaction);
  logError.mockRestore();
});

describe('updateBlog', () => {
  it('scopes the post update to the signed-in owner', async () => {
    const res = await updateBlog('blog-1', input);

    expect(res.success).toBe(true);
    expect(blogUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'blog-1', userId: 'admin-1' } })
    );
  });

  it('stores each body as the JSON string its column holds', async () => {
    await updateBlog('blog-1', input);

    expect(translationCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          blogId: 'blog-1',
          language: 'en',
          content: JSON.stringify(body),
        }),
      ],
    });
  });

  it('leaves the translations alone when the post update is refused', async () => {
    blogUpdate.mockRejectedValue(
      new Error('No record was found for an update.')
    );

    const res = await updateBlog('blog-1', input);

    expect(res.success).toBe(false);
    expect(translationDeleteMany).not.toHaveBeenCalled();
    expect(translationCreateMany).not.toHaveBeenCalled();
  });
});
