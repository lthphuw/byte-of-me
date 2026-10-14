'use server';

import { cookies, headers } from 'next/headers';

import { recordBlogView } from '@/features/public/blog-analytics/lib/blog-view-log';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/** Resolves to the view's log id, which the reading-time beats are sent against. */
export async function trackBlogView(
  blogId: string
): Promise<ApiResponse<string>> {
  return recordBlogView(blogId, {
    cookieJar: await cookies(),
    headerList: await headers(),
  });
}
