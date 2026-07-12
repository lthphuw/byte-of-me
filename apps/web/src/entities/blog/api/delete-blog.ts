'use server';

import { type Blog, prisma } from '@byte-of-me/db';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function deleteBlog(id: string): Promise<ApiResponse<Blog>> {
  const session = await requireAdmin();

  try {
    const deleted = await prisma.blog.delete({
      where: {
        id,
        userId: session.id,
      },
    });

    revalidateTag(CACHE_TAGS.BLOG, 'max');

    return { success: true, data: deleted };
  } catch (error) {
    console.error('[DELETE_BLOG_ERROR]', error);
    return { success: false, errorMsg: 'Failed to delete blog post' };
  }
}
