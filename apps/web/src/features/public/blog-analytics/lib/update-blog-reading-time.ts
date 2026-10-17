'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { cookies, headers } from 'next/headers';

import { recordReadingTime } from '@/features/public/blog-analytics/lib/blog-view-log';

export async function updateBlogReadingTime(
  logId: string,
  seconds: number
): Promise<ApiResponse<null>> {
  return recordReadingTime(logId, seconds, {
    cookieJar: await cookies(),
    headerList: await headers(),
  });
}
