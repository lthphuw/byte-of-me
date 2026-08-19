/**
 * `getPaginatedPublicBlogs` is a `'use server'` action reached only through
 * Next.js's server runtime in production (locale resolution, the
 * incremental cache, `server-only`'s bundler alias — see
 * `apps/web/next-runtime-stubs.ts` for why each needs a stand-in under
 * `bun test`). None of that is what this spec defends. What it defends is
 * the action's own contract: the envelope shape callers rely on, that
 * caller-controlled pagination is bounded before it reaches Prisma (see
 * `clampPagination` in `@/shared/lib/pagination`, already unit-tested on its
 * own), and that an anonymous caller only ever sees published posts.
 *
 * Prisma is not spied on: Prisma 7 synthesizes a fresh function per method
 * access (`prisma.blog.findMany !== prisma.blog.findMany`), so
 * `spyOn(prisma.blog, 'findMany')` patches a value the client never reads
 * back. The whole `blog` delegate is replaced instead, mirroring
 * `apps/web/src/shared/lib/rate-limit.spec.ts`.
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

// `env.ts` (reached transitively through this action) validates eagerly at
// import time against `typeof window`, and `happydom.ts` (an earlier
// preload, needed by *.spec.tsx files) has already registered a global
// `window` by the time this file's imports run. Left in place, that makes
// the env module treat this test process as a browser and refuse every
// server-only key it holds (`onInvalidAccess`) the moment the action reads
// one. This spec never renders anything, so the DOM global is dropped
// before the action is imported.
//
// This used to call `GlobalRegistrator.unregister()` (destroying happy-dom's
// `Window`) with nothing to undo it. `GlobalRegistrator` is process-global,
// not per-file — confirmed the hard way by `note-editor.spec.tsx`, the first
// `*.spec.tsx` in this suite: every file that ran after this one in the same
// `bun test` process saw no `document` at all and `render()` failed outright
// (contradicting an earlier version of this comment, which claimed each spec
// file gets its own globals). Re-registering afterward
// (`GlobalRegistrator.register()`) does not fix it either — that builds a
// SECOND, different `Window` instance, and anything that had already cached
// a reference to the FIRST one (`@testing-library/react`, apparently) keeps
// pointing at a `document` whose `defaultView` `unregister()` had already
// torn down, so `render()` fails with "window object is not available for
// the provided node" instead. What actually works, and is what this does
// now: never destroy the `Window` at all. Only `typeof window` needs to read
// `'undefined'` for `onInvalidAccess` to back off, so this deletes just the
// two global BINDINGS `window`/`document` point at (keeping the underlying
// happy-dom objects alive and untouched) and restores the exact same
// references afterward — nothing downstream can tell the difference.
const originalWindow = globalThis.window;
const originalDocument = globalThis.document;

let getPaginatedPublicBlogs: typeof GetPaginatedPublicBlogsModule.getPaginatedPublicBlogs;

beforeAll(async () => {
  // `Reflect.deleteProperty`, not the `delete` operator: `delete
  // globalThis.window` needs `window` to be an optional property of
  // `globalThis`'s type to type-check, which it is not, so that reads as a
  // type error `@ts-expect-error` would have to paper over — the first
  // type-suppression directive anywhere in `apps/web/src` (AGENTS §11.2 bans
  // `@ts-ignore` by name; a `@ts-expect-error` here is the same class of
  // problem with no existing precedent to justify it). `Reflect.deleteProperty`
  // is a plain runtime call, not the operator, so it is not subject to that
  // restriction and needs no suppression.
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
    // The failure field is `errorMsg` (§8), and it is a fixed sentence: this
    // used to assert `toContain('connection refused')`, which is the driver's
    // own message and reached a public page verbatim. `handlePublicAction`
    // keeps it in the log now — see `shared/api/public-action-template.spec.ts`.
    expect(res.errorMsg).not.toContain('connection refused');
    expect(res.errorCode).toBe('unknown');
    expect((res as { error?: unknown }).error).toBeUndefined();
  });

  it('clamps out-of-range pagination before it reaches Prisma', async () => {
    // clampPagination's own bounds (defaultLimit 9, maxLimit 50) are tested
    // in pagination.spec.ts; this only checks the action actually applies
    // them before querying, using an out-of-range page and an oversized
    // limit together.
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
});
