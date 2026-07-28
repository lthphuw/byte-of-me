'use server';

import { type Blog, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { CACHE_TAGS } from '@/shared/lib/constants';
import { idSchema, parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function deleteBlog(id: string): Promise<ApiResponse<Blog>> {
  const session = await requireAdmin();

  const parsedId = parseInput(idSchema, id);
  if (!parsedId.ok) {
    return { success: false, errorMsg: parsedId.errorMsg };
  }

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
    logger.error('[DELETE_BLOG_ERROR]', { error });
    return { success: false, errorMsg: 'Failed to delete blog post' };
  }
}
