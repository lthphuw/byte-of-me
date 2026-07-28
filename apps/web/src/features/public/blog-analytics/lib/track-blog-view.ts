'use server';

import { prisma } from '@byte-of-me/db';
import { cookies, headers } from 'next/headers';
import { userAgent } from 'next/server';

import { checkRateLimit } from '@/shared/lib/rate-limit';

const CUID_PATTERN = /^c[a-z0-9]{20,32}$/;

export async function trackBlogView(blogId: string) {
  // Anonymous endpoint — reject malformed ids before they reach the DB.
  if (typeof blogId !== 'string' || !CUID_PATTERN.test(blogId)) {
    return { success: false };
  }

  const cookieStore = await cookies();
  const viewCookieName = `viewed_${blogId}`;
  const existingLogId = cookieStore.get(viewCookieName)?.value;

  if (existingLogId) {
    return { success: true, data: existingLogId };
  }

  try {
    const headerList = await headers();

    // Fire-and-forget analytics: a throttled client is simply not recorded,
    // no error surfaces to the reader.
    const ip =
      headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const { allowed } = await checkRateLimit({
      key: `view:${ip}`,
      limit: 60,
      windowSec: 60,
    });
    if (!allowed) {
      return { success: false };
    }

    const { device, browser, os } = userAgent({ headers: headerList });

    const log = await prisma.blogStatisticLog.create({
      data: {
        blogId,
        deviceType: device.type || 'desktop',
        browser: browser.name || 'unknown',
        countryCode: headerList.get('x-vercel-ip-country') || 'Unknown',
        referrer: headerList.get('referer'),
        readingTime: 0,
      },
    });

    cookieStore.set(viewCookieName, log.id, {
      maxAge: 60 * 60 * 24, // 1 day
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return { success: true, data: log.id };
  } catch (error) {
    return { success: false };
  }
}
