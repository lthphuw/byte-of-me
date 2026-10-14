/**
 * `trackBlogView` and `updateBlogReadingTime` are anonymous endpoints. What is
 * defended: only a published blog can be viewed, a caller cannot write to a log
 * it was not given (the cookie is signed), nothing reaches the rate limiter
 * before that proof, and a failure never carries database text back out.
 * Prisma's delegates are replaced by in-memory fakes.
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

import { recordBlogView, recordReadingTime } from './blog-view-log';
import { signViewToken } from './view-token';

import { PUBLIC_ACTION_FAILURE_MESSAGE } from '@/shared/api';

const BLOG_ID = 'cl9ebqhxk00003b600tymydho';
const LOG_ID = 'cl9ebqhxk00009b600tymydzz';
const OTHER_LOG_ID = 'cl9ebqhxk00007b600tymydaa';

const blogFindFirst = mock();
const logCreate = mock();
const logUpdate = mock();
const upsert = mock();
const deleteMany = mock();

const original = {
  blog: Object.getOwnPropertyDescriptor(prisma, 'blog'),
  blogStatisticLog: Object.getOwnPropertyDescriptor(prisma, 'blogStatisticLog'),
  rateLimitHit: Object.getOwnPropertyDescriptor(prisma, 'rateLimitHit'),
};
const define = (name: string, value: unknown) =>
  Object.defineProperty(prisma, name, {
    value,
    writable: true,
    configurable: true,
  });

const logError = spyOn(logger, 'error').mockImplementation(() => {});

afterAll(() => {
  for (const [name, descriptor] of Object.entries(original)) {
    if (descriptor) Object.defineProperty(prisma, name, descriptor);
  }
  logError.mockRestore();
});

function scope(
  cookies: Record<string, string> = {},
  headers: Record<string, string> = { 'x-vercel-forwarded-for': '203.0.113.7' }
) {
  const jar = new Map(Object.entries(cookies));
  const set = mock((name: string, value: string) => {
    jar.set(name, value);
  });
  return {
    set,
    jar,
    request: {
      cookieJar: {
        get: (name: string) => {
          const value = jar.get(name);
          return value === undefined ? undefined : { name, value };
        },
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        set,
      },
      headerList: new Headers(headers),
    } as unknown as Parameters<typeof recordBlogView>[1],
  };
}

const limiterKeys = () =>
  upsert.mock.calls.map(
    (call) =>
      (call[0] as { where: { key_windowStart: { key: string } } }).where
        .key_windowStart.key
  );

beforeEach(() => {
  blogFindFirst.mockReset().mockResolvedValue({ id: BLOG_ID });
  logCreate.mockReset().mockResolvedValue({ id: LOG_ID });
  logUpdate.mockReset().mockResolvedValue({});
  upsert.mockReset().mockResolvedValue({ count: 1 });
  deleteMany.mockReset().mockResolvedValue({ count: 0 });
  logError.mockClear();
  define('blog', { findFirst: blogFindFirst });
  define('blogStatisticLog', { create: logCreate, update: logUpdate });
  define('rateLimitHit', { upsert, deleteMany });
});

describe('recordBlogView', () => {
  it('logs a view of a published blog and sets a signed cookie', async () => {
    const { request, set } = scope();

    const res = await recordBlogView(BLOG_ID, request);

    expect(res).toEqual({ success: true, data: LOG_ID });
    expect(blogFindFirst.mock.calls[0]?.[0]).toMatchObject({
      where: { id: BLOG_ID, isPublished: true },
    });
    expect(set.mock.calls[0]?.[0]).toBe(`viewed_${BLOG_ID}`);
    expect(set.mock.calls[0]?.[1]).toBe(signViewToken(LOG_ID));
    expect(set.mock.calls[0]?.[1]).not.toBe(LOG_ID);
  });

  it('refuses a draft or unknown blog without inserting a row', async () => {
    blogFindFirst.mockResolvedValue(null);
    const { request, set } = scope();

    const res = await recordBlogView(BLOG_ID, request);

    expect(res).toEqual({ success: false, errorMsg: 'Blog not found' });
    expect(logCreate).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  it('truncates a hostile Referer before storing it', async () => {
    const { request } = scope(
      {},
      {
        'x-vercel-forwarded-for': '203.0.113.7',
        referer: `https://example.com/${'a'.repeat(5000)}`,
      }
    );

    await recordBlogView(BLOG_ID, request);

    const stored = (
      logCreate.mock.calls[0]?.[0] as { data: { referrer: string } }
    ).data.referrer;
    expect(stored).toHaveLength(512);
  });

  it('answers a signed cookie with its log id and writes nothing', async () => {
    const { request } = scope({
      [`viewed_${BLOG_ID}`]: signViewToken(OTHER_LOG_ID),
    });

    const res = await recordBlogView(BLOG_ID, request);

    expect(res).toEqual({ success: true, data: OTHER_LOG_ID });
    expect(logCreate).not.toHaveBeenCalled();
  });

  it('does not trust a bare log id in the cookie', async () => {
    const { request } = scope({ [`viewed_${BLOG_ID}`]: OTHER_LOG_ID });

    const res = await recordBlogView(BLOG_ID, request);

    expect(res).toEqual({ success: true, data: LOG_ID });
    expect(logCreate).toHaveBeenCalledTimes(1);
  });

  it('refuses a malformed id before any query', async () => {
    const { request } = scope();

    const res = await recordBlogView({ not: '' } as unknown as string, request);

    expect(res.success).toBe(false);
    expect(blogFindFirst).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('refuses a client over the per-IP budget before touching the blog', async () => {
    upsert.mockResolvedValue({ count: 61 });
    const { request } = scope();

    const res = await recordBlogView(BLOG_ID, request);

    expect(res.success).toBe(false);
    expect(blogFindFirst).not.toHaveBeenCalled();
  });

  it('hides database text behind a fixed message and logs the detail', async () => {
    logCreate.mockRejectedValue(
      new Error('Foreign key constraint violated on db.internal.example:5432')
    );
    const { request } = scope();

    const res = await recordBlogView(BLOG_ID, request);

    expect(res).toEqual({
      success: false,
      errorMsg: PUBLIC_ACTION_FAILURE_MESSAGE,
    });
    expect(JSON.stringify(logError.mock.calls)).toContain(
      'db.internal.example'
    );
  });
});

describe('recordReadingTime', () => {
  const signedCookie = (logId: string) => ({
    [`viewed_${BLOG_ID}`]: signViewToken(logId),
  });

  it('adds the seconds to the log the browser owns', async () => {
    const { request } = scope(signedCookie(LOG_ID));

    const res = await recordReadingTime(LOG_ID, 15, request);

    expect(res).toEqual({ success: true, data: null });
    expect(logUpdate).toHaveBeenCalledWith({
      where: { id: LOG_ID },
      data: { readingTime: { increment: 15 } },
    });
  });

  it('caps one update at five minutes', async () => {
    const { request } = scope(signedCookie(LOG_ID));

    await recordReadingTime(LOG_ID, 99_999, request);

    expect(logUpdate.mock.calls[0]?.[0]).toMatchObject({
      data: { readingTime: { increment: 300 } },
    });
  });

  it('refuses a forged cookie that merely repeats the log id', async () => {
    const { request } = scope({ [`viewed_${BLOG_ID}`]: OTHER_LOG_ID });

    const res = await recordReadingTime(OTHER_LOG_ID, 60, request);

    expect(res.success).toBe(false);
    expect(logUpdate).not.toHaveBeenCalled();
  });

  it('refuses a log id that is not the one the cookie is signed for', async () => {
    const { request } = scope(signedCookie(LOG_ID));

    const res = await recordReadingTime(OTHER_LOG_ID, 60, request);

    expect(res.success).toBe(false);
    expect(logUpdate).not.toHaveBeenCalled();
  });

  it('writes no rate-limit row for a caller without a signed cookie', async () => {
    const { request } = scope();

    await recordReadingTime(OTHER_LOG_ID, 60, request);
    await recordReadingTime('anything-the-caller-likes', 60, request);

    expect(upsert).not.toHaveBeenCalled();
  });

  it('refuses an id of the wrong shape before reading the cookie', async () => {
    const { request } = scope(signedCookie(LOG_ID));

    const res = await recordReadingTime(
      { not: '' } as unknown as string,
      60,
      request
    );

    expect(res.success).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
    expect(logUpdate).not.toHaveBeenCalled();
  });

  it.each([0, -3, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuses %p seconds',
    async (seconds) => {
      const { request } = scope(signedCookie(LOG_ID));

      const res = await recordReadingTime(LOG_ID, seconds, request);

      expect(res.success).toBe(false);
      expect(logUpdate).not.toHaveBeenCalled();
    }
  );

  it('checks the client address bucket before the per-log bucket', async () => {
    const { request } = scope(signedCookie(LOG_ID));

    await recordReadingTime(LOG_ID, 15, request);

    expect(limiterKeys()).toEqual([
      'reading-time-ip:203.0.113.7',
      `reading-time:${LOG_ID}`,
    ]);
  });

  it('stops at the address bucket when the client is over budget', async () => {
    upsert.mockResolvedValue({ count: 100_000 });
    const { request } = scope(signedCookie(LOG_ID));

    const res = await recordReadingTime(LOG_ID, 15, request);

    expect(res.success).toBe(false);
    expect(limiterKeys()).toEqual(['reading-time-ip:203.0.113.7']);
    expect(logUpdate).not.toHaveBeenCalled();
  });

  it('hides database text behind a fixed message and logs the detail', async () => {
    logUpdate.mockRejectedValue(
      new Error('Record to update not found. (db.internal.example)')
    );
    const { request } = scope(signedCookie(LOG_ID));

    const res = await recordReadingTime(LOG_ID, 15, request);

    expect(res).toEqual({
      success: false,
      errorMsg: PUBLIC_ACTION_FAILURE_MESSAGE,
    });
    expect(JSON.stringify(logError.mock.calls)).toContain(
      'db.internal.example'
    );
  });
});
