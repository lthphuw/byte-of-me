/**
 * Defends the action's own contract: envelope shape, pagination bounded before Prisma
 * (`clampPagination`), and anonymous callers seeing only published posts. Prisma 7 returns a fresh
 * function per method access, so `spyOn` is bypassed: swap the `blog` delegate.
 */
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

import type * as GetPaginatedPublicBlogsModule from './get-paginated-public-blogs';

// `env.ts` treats a global `window` as a browser and refuses server-only keys, so drop the
// `window`/`document` bindings before the import and restore the same references afterward. Not
// `GlobalRegistrator.unregister()`: it is process-global and breaks every later spec's `render()`.
const originalWindow = globalThis.window;
const originalDocument = globalThis.document;

let getPaginatedPublicBlogs: typeof GetPaginatedPublicBlogsModule.getPaginatedPublicBlogs;

beforeAll(async () => {
  // `Reflect.deleteProperty`, not `delete globalThis.window`: that fails type-check (`window` is
  // not optional) and the repo bans type suppressions (AGENTS §11.2).
  Reflect.deleteProperty(globalThis, 'window');
  Reflect.deleteProperty(globalThis, 'document');
  ({ getPaginatedPublicBlogs } = await import('./get-paginated-public-blogs'));
});

afterAll(() => {
  globalThis.window = originalWindow;
  globalThis.document = originalDocument;
});

const findMany = mock();
const count = mock();
Object.defineProperty(prisma, 'blog', {
  value: { findMany, count },
  writable: true,
  configurable: true,
});

const blogRow = {
  id: 'blog-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  slug: 'hello-world',
  isPublished: true,
  publishedDate: new Date('2026-01-03T00:00:00.000Z'),
  translations: [{ language: 'en', title: 'Hello', description: 'World' }],
  project: null,
  coverImage: null,
  readingTime: 5,
  tags: [],
  _count: { blogViewLogs: 3 },
};

describe('getPaginatedPublicBlogs', () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([blogRow]);
    count.mockReset().mockResolvedValue(1);
  });

  it('returns a success envelope shaped as PaginatedData', async () => {
    const res = await getPaginatedPublicBlogs({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.data).toHaveLength(1);
    expect(res.data.data[0]?.slug).toBe('hello-world');
    expect(res.data.meta).toEqual({
      currentPage: 1,
      totalPages: 1,
      totalCount: 1,
      hasMore: false,
    });
  });

  it('reports failure through errorMsg, never error, when the query rejects', async () => {
    findMany.mockRejectedValue(new Error('connection refused'));

    const res = await getPaginatedPublicBlogs({});

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    // The failure field is `errorMsg` (§8), a fixed sentence: the driver's own message must not
    // reach a public page (`handlePublicAction` logs it).
    expect(res.errorMsg).not.toContain('connection refused');
    expect(res.errorCode).toBe('unknown');
    expect((res as { error?: unknown }).error).toBeUndefined();
  });

  it('clamps out-of-range pagination before it reaches Prisma', async () => {
    // Bounds (defaultLimit 9, maxLimit 50) are tested in pagination.spec.ts; this checks the action
    // applies them before querying, with an out-of-range page and an oversized limit.
    await getPaginatedPublicBlogs({ page: 0, limit: 1_000_000 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 })
    );
  });

  it('scopes an anonymous caller to published posts only', async () => {
    await getPaginatedPublicBlogs({});

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isPublished: true } })
    );
    expect(count).toHaveBeenCalledWith({ where: { isPublished: true } });
  });

  it('does not send a draft project to a visitor', async () => {
    findMany.mockResolvedValue([
      {
        ...blogRow,
        project: {
          id: 'proj-1',
          slug: 'secret',
          isPublished: false,
          translations: [
            { language: 'en', title: 'Draft', description: '{"draft":true}' },
          ],
        },
      },
    ]);

    const res = await getPaginatedPublicBlogs({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.data[0]?.project).toBeNull();
    expect(JSON.stringify(res.data)).not.toContain('secret');
  });

  it('keeps a published project on its post', async () => {
    findMany.mockResolvedValue([
      {
        ...blogRow,
        project: {
          id: 'proj-1',
          slug: 'shipped',
          isPublished: true,
          translations: [
            { language: 'en', title: 'Shipped', description: 'Out' },
          ],
        },
      },
    ]);

    const res = await getPaginatedPublicBlogs({});

    if (!res.success) throw new Error('unreachable');
    expect(res.data.data[0]?.project).toEqual({
      id: 'proj-1',
      slug: 'shipped',
      title: 'Shipped',
      description: 'Out',
    });
  });

  it('selects only the rendered media columns for the cover image', async () => {
    await getPaginatedPublicBlogs({});

    const { include } = findMany.mock.calls[0]?.[0] as {
      include: { coverImage: unknown };
    };
    expect(include.coverImage).toEqual({
      select: {
        id: true,
        url: true,
        width: true,
        height: true,
        mimeType: true,
      },
    });
  });

  it.each([
    [
      'too many tag slugs',
      { tagSlugs: Array.from({ length: 11 }, (_, i) => `t-${i}`) },
    ],
    ['an oversized slug', { tagSlugs: ['a'.repeat(65)] }],
    ['an oversized search', { search: 'x'.repeat(101) }],
    ['a search that is not text', { search: { contains: '' } }],
    ['slugs that are not strings', { tagSlugs: [{ not: '' }] }],
    ['a draft flag that is not a boolean', { includeDrafts: 'yes' }],
  ])('refuses %s without querying', async (_label, params) => {
    const res = await getPaginatedPublicBlogs(
      params as unknown as Parameters<typeof getPaginatedPublicBlogs>[0]
    );

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect(findMany).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
  });
});
