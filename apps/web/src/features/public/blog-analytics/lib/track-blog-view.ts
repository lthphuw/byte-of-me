'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { cookies, headers } from 'next/headers';

import { recordBlogView } from '@/features/public/blog-analytics/lib/blog-view-log';

/** Resolves to the view's log id, which the reading-time beats are sent against. */
export async function trackBlogView(
  blogId: string
): Promise<ApiResponse<string>> {
  return recordBlogView(blogId, {
    cookieJar: await cookies(),
    headerList: await headers(),
  });
}
