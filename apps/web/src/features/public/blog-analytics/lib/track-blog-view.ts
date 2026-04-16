'use server';

import { prisma } from '@byte-of-me/db';
import { cookies, headers } from 'next/headers';
import { userAgent } from 'next/server';

export async function trackBlogView(blogId: string) {
  const cookieStore = await cookies();
  const viewCookieName = `viewed_${blogId}`;
  const existingLogId = cookieStore.get(viewCookieName)?.value;

  if (existingLogId) {
    return { success: true, data: existingLogId };
  }

  try {
    const headerList = await headers();

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
