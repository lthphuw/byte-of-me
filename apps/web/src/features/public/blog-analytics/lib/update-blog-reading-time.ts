'use server';

import { cookies, headers } from 'next/headers';

import { recordReadingTime } from '@/features/public/blog-analytics/lib/blog-view-log';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function updateBlogReadingTime(
  logId: string,
  seconds: number
): Promise<ApiResponse<null>> {
  return recordReadingTime(logId, seconds, {
    cookieJar: await cookies(),
    headerList: await headers(),
  });
}
