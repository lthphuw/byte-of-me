import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import type { cookies, headers } from 'next/headers';
import { userAgent } from 'next/server';

import 'server-only';

import {
  signViewToken,
  verifyViewToken,
} from '@/features/public/blog-analytics/lib/view-token';
import { PUBLIC_ACTION_FAILURE_MESSAGE } from '@/shared/api';
import { getClientIp } from '@/shared/lib/client-ip';
import { cuidSchema } from '@/shared/lib/public-input-schema';
import { checkRateLimit } from '@/shared/lib/rate-limit';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * The logic of `trackBlogView` / `updateBlogReadingTime`, with the request's
 * cookies and headers passed in. A `'use server'` file may export only actions,
 * and an extra parameter on an action is one more thing a caller can post.
 */

type CookieJar = Pick<
  Awaited<ReturnType<typeof cookies>>,
  'get' | 'getAll' | 'set'
>;
type RequestHeaders = Awaited<ReturnType<typeof headers>>;

export type RequestScope = { cookieJar: CookieJar; headerList: RequestHeaders };

// A single heartbeat can never legitimately report more than a few minutes.
const MAX_SECONDS_PER_UPDATE = 300;
const MAX_REFERRER_LENGTH = 512;
const VIEW_COOKIE_PREFIX = 'viewed_';

export async function recordBlogView(
  blogId: string,
  { cookieJar, headerList }: RequestScope
): Promise<ApiResponse<string>> {
  // Anonymous endpoint: reject malformed ids before they reach the DB.
  const parsed = parseInput(cuidSchema, blogId, 'trackBlogView');
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }

  const viewCookieName = `${VIEW_COOKIE_PREFIX}${parsed.data}`;
  // A bare id from before the cookie was signed fails here and counts once more.
  const existingLogId = verifyViewToken(cookieJar.get(viewCookieName)?.value);

  if (existingLogId) {
    return { success: true, data: existingLogId };
  }

  try {
    const { allowed } = await checkRateLimit({
      key: `view:${getClientIp(headerList)}`,
      limit: 60,
      windowSec: 60,
    });
    if (!allowed) {
      return { success: false, errorMsg: 'Too many views from this client' };
    }

    // Checked first: a draft or unknown id is a clean refusal, not an FK error.
    const blog = await prisma.blog.findFirst({
      where: { id: parsed.data, isPublished: true },
      select: { id: true },
    });
    if (!blog) {
      return { success: false, errorMsg: 'Blog not found' };
    }

    const { device, browser } = userAgent({ headers: headerList });

    const log = await prisma.blogStatisticLog.create({
      data: {
        blogId: parsed.data,
        deviceType: device.type || 'desktop',
        browser: browser.name || 'unknown',
        countryCode: headerList.get('x-vercel-ip-country') || 'Unknown',
        referrer: headerList.get('referer')?.slice(0, MAX_REFERRER_LENGTH),
        readingTime: 0,
      },
    });

    cookieJar.set(viewCookieName, signViewToken(log.id), {
      maxAge: 60 * 60 * 24, // 1 day
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return { success: true, data: log.id };
  } catch (error) {
    logger.error(`[BlogAnalytics] trackBlogView: ${getErrorMessage(error)}`);
    return { success: false, errorMsg: PUBLIC_ACTION_FAILURE_MESSAGE };
  }
}

export async function recordReadingTime(
  logId: string,
  seconds: number,
  { cookieJar, headerList }: RequestScope
): Promise<ApiResponse<null>> {
  const parsed = parseInput(cuidSchema, logId, 'updateBlogReadingTime');
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }

  // Anonymous endpoint: only accept increments for a log this browser created.
  // The cookie is HMAC-signed, so the caller cannot name a log it was not given.
  const ownsLog = cookieJar
    .getAll()
    .some(
      (c) =>
        c.name.startsWith(VIEW_COOKIE_PREFIX) &&
        verifyViewToken(c.value) === parsed.data
    );

  const increment = Math.floor(seconds);
  if (!ownsLog || !Number.isFinite(increment) || increment < 1) {
    return { success: false, errorMsg: 'Reading time is not for this view' };
  }

  try {
    // Only a caller that passed the cookie check reaches a limiter write, so
    // arbitrary keys cannot fill `rate_limit_hits`. The IP bucket comes first
    // and is wide (a NAT shares it); the log bucket is the tight one.
    const byIp = await checkRateLimit({
      key: `reading-time-ip:${getClientIp(headerList)}`,
      limit: 240,
      windowSec: 60,
    });
    // The client beats every 15s, so a burst is a script.
    const byLog = byIp.allowed
      ? await checkRateLimit({
          key: `reading-time:${parsed.data}`,
          limit: 10,
          windowSec: 60,
        })
      : byIp;
    if (!byLog.allowed) {
      return { success: false, errorMsg: 'Too many reading-time updates' };
    }

    await prisma.blogStatisticLog.update({
      where: { id: parsed.data },
      data: {
        readingTime: {
          increment: Math.min(increment, MAX_SECONDS_PER_UPDATE),
        },
      },
    });

    return { success: true, data: null };
  } catch (error) {
    logger.error(
      `[BlogAnalytics] updateBlogReadingTime ${parsed.data}: ${getErrorMessage(
        error
      )}`
    );
    return { success: false, errorMsg: PUBLIC_ACTION_FAILURE_MESSAGE };
  }
}
