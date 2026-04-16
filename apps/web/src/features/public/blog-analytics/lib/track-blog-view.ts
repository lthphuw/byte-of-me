'use server';

import { prisma } from '@byte-of-me/db';
import { cookies, headers } from 'next/headers';

export async function trackBlogView(blogId: string) {
  const cookieStore = await cookies();
  const viewCookieName = `viewed_${blogId}`;
  const existingLogId = cookieStore.get(viewCookieName)?.value;

  if (existingLogId) return { success: true, data: existingLogId };

  try {
    const headerList = await headers();
    const ua = headerList.get('user-agent') || '';

    const { UAParser } = await import('ua-parser-js');
    const parser = new UAParser(ua);

    const log = await prisma.blogStatisticLog.create({
      data: {
        blogId,
        deviceType: parser.getDevice().type || 'desktop',
        browser: parser.getBrowser().name,
        countryCode: headerList.get('x-vercel-ip-country') || 'Unknown',
        referrer: headerList.get('referer'),
        readingTime: 0,
      },
    });

    cookieStore.set(viewCookieName, log.id, {
      maxAge: 60 * 60 * 24,
      httpOnly: true,
      path: '/',
    });

    return { success: true, data: log.id };
  } catch (error) {
    return { success: false };
  }
}
