'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { cookies, headers } from 'next/headers';
import { userAgent } from 'next/server';

import { getClientIp } from '@/shared/lib/client-ip';
import { cuidSchema } from '@/shared/lib/public-input-schema';
import { checkRateLimit } from '@/shared/lib/rate-limit';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** Resolves to the view's log id, which the reading-time beats are sent against. */
export async function trackBlogView(
  blogId: string
): Promise<ApiResponse<string>> {
  // Anonymous endpoint: reject malformed ids before they reach the DB.
  const parsed = parseInput(cuidSchema, blogId, 'trackBlogView');
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }

  const cookieStore = await cookies();
  const viewCookieName = `viewed_${parsed.data}`;
  const existingLogId = cookieStore.get(viewCookieName)?.value;

  if (existingLogId) {
    return { success: true, data: existingLogId };
  }

  try {
    const headerList = await headers();

    const { allowed } = await checkRateLimit({
      key: `view:${getClientIp(headerList)}`,
      limit: 60,
      windowSec: 60,
    });
    if (!allowed) {
      return { success: false, errorMsg: 'Too many views from this client' };
    }

    const { device, browser } = userAgent({ headers: headerList });

    const log = await prisma.blogStatisticLog.create({
      data: {
        blogId: parsed.data,
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
    const errorMsg = getErrorMessage(error, 'Failed to record the view');
    logger.error(`[BlogAnalytics] trackBlogView: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
